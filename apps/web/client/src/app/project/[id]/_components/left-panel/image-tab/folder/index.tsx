import { type FolderNode } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { findFolderInStructureByPath } from '@onlook/utility';
import { isEqual } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { useFolderImages } from '../hooks/use-folder-images';
import { useImageSearch } from '../hooks/use-image-search';
import { ImageList } from '../image-list';
import { useImagesContext } from '../providers/images-provider';
import { FolderDropdownMenu } from './folder-dropdown-menu';
import { FolderList } from './folder-list';
import { FolderCreateModal } from './modal/folder-create-modal';

interface FolderPathItem {
    folder: FolderNode;
    name: string;
}

export default function Folder() {
    const inputRef = useRef<HTMLInputElement>(null);
    const breadcrumbsRef = useRef<HTMLDivElement>(null);
    const { uploadOperations, isOperating, rootFolderStructure, folderOperations } = useImagesContext();
    const [currentFolder, setCurrentFolder] = useState<FolderNode>(rootFolderStructure);
    const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);

    const { folderImagesState, loadFolderImages } = useFolderImages();

    const { search, filteredImages, handleSearchClear, handleSearchChange, handleKeyDown } =
        useImageSearch({
            imageAssets: folderImagesState.images,
        });

    const { handleCreateFolder, isOperating: isFolderOperating } = folderOperations;

    const handleSelectFolder = async (folder: FolderNode) => {
        if (currentFolder) {
            setFolderPath((prev) => [...prev, { folder: currentFolder, name: currentFolder.name }]);
        }
        setCurrentFolder(folder);
    };

    const handleGoBack = () => {
        if (folderPath.length > 0) {
            const previousFolder = folderPath[folderPath.length - 1];
            if (previousFolder) {
                setCurrentFolder(previousFolder.folder);
                setFolderPath((prev) => prev.slice(0, -1));
            }
        } else {
            setCurrentFolder(rootFolderStructure);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setCurrentFolder(rootFolderStructure);
            setFolderPath([]);
        } else {
            const targetFolder = folderPath[index];
            if (targetFolder) {
                setCurrentFolder(targetFolder.folder);
                setFolderPath((prev) => prev.slice(0, index));
            }
        }
    };

    useEffect(() => {
        if (currentFolder) {
            loadFolderImages(currentFolder);
        }
    }, [currentFolder]);

    useEffect(() => {
        const handleFolderOperations = async () => {
            // Update current folder when structure changes
            const updatedFolder = findFolderInStructureByPath(
                rootFolderStructure,
                currentFolder?.fullPath ?? '',
            );

            if (!updatedFolder) {
                setCurrentFolder(rootFolderStructure);
                setFolderPath([]);
            } else if (!isEqual(updatedFolder, currentFolder)) {
                setCurrentFolder(updatedFolder);
            }
        };

        handleFolderOperations();
    }, [rootFolderStructure]);

    // Auto-scroll breadcrumbs to the right when folder path changes
    useEffect(() => {
        if (breadcrumbsRef.current) {
            breadcrumbsRef.current.scrollLeft = breadcrumbsRef.current.scrollWidth;
        }
    }, [folderPath]);

    const handleKeyDownWithRef = (e: React.KeyboardEvent) => {
        handleKeyDown(e);
        if (e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };

    const canGoBack = folderPath.length > 0 || currentFolder !== rootFolderStructure;
    const isAnyOperationLoading = isOperating || isFolderOperating;

    const showCreateButton =
        !!currentFolder &&
        currentFolder === rootFolderStructure &&
        (currentFolder.children?.size ?? 0) === 0;

    return (
        <div className="flex flex-col gap-2 h-full">
            {/* Navigation Header */}
            {canGoBack && (
                <>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleGoBack}
                            disabled={!canGoBack}
                            className="h-8 w-8 relative z-10"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                        </Button>

                        {/* Breadcrumbs Container with Fade Gradient */}
                        <div className="relative flex-1 min-w-0">
                            {/* Fade Gradient Overlay */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background-primary to-transparent z-10 pointer-events-none" />

                            {/* Breadcrumbs */}
                            <div
                                ref={breadcrumbsRef}
                                className="flex items-center gap-1 text-sm text-gray-200 overflow-x-auto scrollbar-hide scroll-smooth"
                            >
                                {folderPath.map((pathItem, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                        <Icons.ChevronRight className="h-3 w-3 text-gray-400" />
                                        <button
                                            onClick={() => handleBreadcrumbClick(index)}
                                            className="hover:text-white transition-colors whitespace-nowrap"
                                        >
                                            {pathItem.name}
                                        </button>
                                    </div>
                                ))}

                                {currentFolder && currentFolder !== rootFolderStructure && (
                                    <div className="flex items-center gap-1">
                                        <Icons.ChevronRight className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium text-white whitespace-nowrap">
                                            {currentFolder.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {currentFolder && (
                            <FolderDropdownMenu
                                folder={currentFolder}
                                className="bg-gray-700"
                                alwaysVisible={true}
                            />
                        )}
                    </div>
                    <Separator />
                </>
            )}
            <div className="flex flex-row items-center gap-2 m-0">
                <div className="relative min-w-0 flex-1">
                    <Input
                        ref={inputRef}
                        className="h-8 text-xs pr-8 w-full"
                        placeholder="Search images"
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDownWithRef}
                        disabled={isAnyOperationLoading}
                    />

                    {search && (
                        <button
                            className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSearchClear}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                        </button>
                    )}
                </div>
                <Button
                    variant="default"
                    size="icon"
                    className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                    onClick={() => handleCreateFolder(currentFolder)}
                >
                    <Icons.DirectoryPlus className="h-4 w-4" />
                </Button>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                            onClick={uploadOperations.handleClickAddButton}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.Plus />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Upload an image</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>

            {/* Folder Content */}
            <FolderList
                childFolders={Array.from(currentFolder?.children?.values() ?? [])}
                folder={currentFolder}
                showCreateButton={showCreateButton}
                onSelectFolder={handleSelectFolder}
            />

            {/* Images Section */}
            {folderImagesState.isLoading ? (
                <div className="flex items-center justify-center h-32 text-xs text-foreground-primary/50">
                    <div className="flex items-center gap-2">
                        <Icons.Reload className="w-4 h-4 animate-spin" />
                        Loading images...
                    </div>
                </div>
            ) : (
                <ImageList images={filteredImages} currentFolder={currentFolder.fullPath} />
            )}

            <FolderCreateModal />
        </div>
    );
}
