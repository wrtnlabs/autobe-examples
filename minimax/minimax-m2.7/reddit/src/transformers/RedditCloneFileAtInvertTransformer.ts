import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFileAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_filename: true,
        stored_filename: true,
        mime_type: true,
        file_size: true,
        storage_path: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        uploader: {
          select: {
            id: true,
            username: true,
          },
        },
        communityIcons: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_iconsFindManyArgs,
        postImages: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
        fileAssociation: {
          select: {
            id: true,
            target_type: true,
            target_id: true,
            created_at: true,
            file: {
              select: {
                id: true,
                original_filename: true,
                mime_type: true,
                file_size: true,
                status: true,
                created_at: true,
                uploader: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                thumbnails: {
                  select: {
                    id: true,
                    width: true,
                    height: true,
                    variant: true,
                    thumbnail_path: true,
                    created_at: true,
                  },
                } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs,
              },
            } satisfies Prisma.reddit_clone_filesFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_file_associationsFindFirstArgs,
        scans: {
          select: {
            id: true,
            scanned_at: true,
            scanner: true,
            status: true,
            threat_name: true,
            details: true,
            created_at: true,
            updated_at: true,
            file: {
              select: {
                id: true,
                original_filename: true,
                mime_type: true,
                file_size: true,
                status: true,
                created_at: true,
                uploader: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                thumbnails: {
                  select: {
                    id: true,
                    width: true,
                    height: true,
                    variant: true,
                    thumbnail_path: true,
                    created_at: true,
                  },
                } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs,
              },
            } satisfies Prisma.reddit_clone_filesFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_file_scansFindManyArgs,
        thumbnails: {
          select: {
            id: true,
            width: true,
            height: true,
            variant: true,
            thumbnail_path: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFile.IInvert> {
    return {
      id: input.id,
      originalFilename: input.original_filename,
      storedFilename: input.stored_filename,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      storagePath: input.storage_path,
      status: input.status,
      uploader: {
        id: input.uploader.id,
        username: input.uploader.username,
      } satisfies IRedditCloneMember.ISummary,
      associations: input.fileAssociation
        ? [
            {
              id: input.fileAssociation.id,
              userId: input.fileAssociation.target_id,
              file: {
                id: input.fileAssociation.file.id,
                originalFilename: input.fileAssociation.file.original_filename,
                mimeType: input.fileAssociation.file.mime_type,
                fileSize: input.fileAssociation.file.file_size,
                status: input.fileAssociation.file.status,
                createdAt: input.fileAssociation.file.created_at.toISOString(),
                uploader: {
                  id: input.fileAssociation.file.uploader.id,
                  username: input.fileAssociation.file.uploader.username,
                } satisfies IRedditCloneMember.ISummary,
                thumbnails: input.fileAssociation.file.thumbnails?.length
                  ? input.fileAssociation.file.thumbnails.map((t) => ({
                      id: t.id,
                      width: t.width,
                      height: t.height,
                      variant: t.variant,
                      thumbnailPath: t.thumbnail_path,
                      createdAt: t.created_at.toISOString(),
                    }))
                  : undefined,
              } satisfies IRedditCloneFile.ISummary,
              createdAt: input.fileAssociation.created_at.toISOString(),
            } satisfies IRedditCloneFileAssociation.ISummary,
          ]
        : [],
      scans: await ArrayUtil.asyncMap(input.scans, (scan) => ({
        id: scan.id,
        scannedAt: scan.scanned_at.toISOString(),
        scanner: scan.scanner,
        status: scan.status,
        threatName: scan.threat_name ?? undefined,
        details: scan.details ?? undefined,
        createdAt: scan.created_at.toISOString(),
        updatedAt: scan.updated_at.toISOString(),
        file: {
          id: scan.file.id,
          originalFilename: scan.file.original_filename,
          mimeType: scan.file.mime_type,
          fileSize: scan.file.file_size,
          status: scan.file.status,
          createdAt: scan.file.created_at.toISOString(),
          uploader: {
            id: scan.file.uploader.id,
            username: scan.file.uploader.username,
          } satisfies IRedditCloneMember.ISummary,
          thumbnails: scan.file.thumbnails?.length
            ? scan.file.thumbnails.map((t) => ({
                id: t.id,
                width: t.width,
                height: t.height,
                variant: t.variant,
                thumbnailPath: t.thumbnail_path,
                createdAt: t.created_at.toISOString(),
              }))
            : undefined,
        } satisfies IRedditCloneFile.ISummary,
      })),
      thumbnails: input.thumbnails.map((t) => ({
        id: t.id,
        width: t.width,
        height: t.height,
        variant: t.variant,
        thumbnailPath: t.thumbnail_path,
        createdAt: t.created_at.toISOString(),
      })),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt:
        input.deleted_at != null ? input.deleted_at.toISOString() : null,
    } satisfies IRedditCloneFile.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_filesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             original_filename: true,
//             stored_filename: true,
//             mime_type: true,
//             file_size: true,
//             storage_path: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             uploader: RedditCloneMemberAtSummaryTransformer.select(),
//             scans: RedditCloneFileScanTransformer.select(),
//             fileAssociation: RedditCloneFileAssociationAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_clone_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneFile.IInvert> {
//         return {
//   id: {string},
//   originalFilename: {string},
//   storedFilename: {string},
//   mimeType: {string},
//   fileSize: {integer},
//   storagePath: {string},
//   status: {string},
//   uploader: await RedditCloneMemberAtSummaryTransformer.transform(input.uploader),
//   associations: await ArrayUtil.asyncMap(input.fileAssociation, RedditCloneFileAssociationAtSummaryTransformer.transform),
//   scans: await ArrayUtil.asyncMap(input.scans, RedditCloneFileScanTransformer.transform),
//   thumbnails: {Array<IRedditCloneFileThumbnail>},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------