import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneFileThumbnailAtSummaryTransformer } from "./RedditCloneFileThumbnailAtSummaryTransformer";
import { RedditCloneFileScanTransformer } from "./RedditCloneFileScanTransformer";
import { RedditCloneFileAssociationAtSummaryTransformer } from "./RedditCloneFileAssociationAtSummaryTransformer";

export namespace RedditCloneFileTransformer {
    export type Payload = Prisma.reddit_clone_filesGetPayload<ReturnType<typeof select>>;
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
                uploader: RedditCloneMemberAtSummaryTransformer.select(),
                communityIcons: {
                    select: { id: true },
                } satisfies Prisma.reddit_clone_community_iconsFindManyArgs,
                postImages: {
                    select: { id: true },
                } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
                thumbnails: RedditCloneFileThumbnailAtSummaryTransformer.select(),
                scans: RedditCloneFileScanTransformer.select(),
                fileAssociation: RedditCloneFileAssociationAtSummaryTransformer.select(),
            },
        } satisfies Prisma.reddit_clone_filesFindManyArgs;
    }
    export async function transform(input: Payload): Promise<IRedditCloneFile> {
        return {
            id: input.id,
            originalFilename: input.original_filename,
            storedFilename: input.stored_filename,
            mimeType: input.mime_type,
            fileSize: input.file_size,
            storagePath: input.storage_path,
            status: input.status,
            createdAt: toISOStringSafe(input.created_at),
            updatedAt: toISOStringSafe(input.updated_at),
            deletedAt: input.deleted_at !== null && input.deleted_at !== undefined
                ? toISOStringSafe(input.deleted_at)
                : null,
            uploader: await RedditCloneMemberAtSummaryTransformer.transform(input.uploader),
            thumbnails: input.thumbnails.map((thumb) => ({
                items: [await RedditCloneFileThumbnailAtSummaryTransformer.transform(thumb)],
            })),
            scans: await ArrayUtil.asyncMap(input.scans, RedditCloneFileScanTransformer.transform),
            associations: input.fileAssociation
                ? await ArrayUtil.asyncMap(Array.isArray(input.fileAssociation) ? input.fileAssociation : [input.fileAssociation], RedditCloneFileAssociationAtSummaryTransformer.transform)
                : [],
        } satisfies IRedditCloneFile;
    }
}

//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCloneFile> {
//         return {
//   id: {string},
//   originalFilename: {string},
//   storedFilename: {string},
//   mimeType: {string},
//   fileSize: {integer},
//   storagePath: {string},
//   status: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   uploader: await RedditCloneMemberAtSummaryTransformer.transform(input.uploader),
//   thumbnails: {Array<IRedditCloneFileThumbnail>},
//   scans: await ArrayUtil.asyncMap(input.scans, RedditCloneFileScanTransformer.transform),
//   associations: await ArrayUtil.asyncMap(input.fileAssociation, RedditCloneFileAssociationAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------