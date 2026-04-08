import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAssociationAtSummaryTransformer } from "./RedditCloneFileAssociationAtSummaryTransformer";
import { RedditCloneFileScanTransformer } from "./RedditCloneFileScanTransformer";
import { RedditCloneFileThumbnailAtSummaryTransformer } from "./RedditCloneFileThumbnailAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneFileTransformer {
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
        uploader: RedditCloneMemberAtSummaryTransformer.select(),
        thumbnails: RedditCloneFileThumbnailAtSummaryTransformer.select(),
        scans: RedditCloneFileScanTransformer.select(),
        fileAssociation:
          RedditCloneFileAssociationAtSummaryTransformer.select(),
        communityIcons: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_community_iconsFindManyArgs,
        postImages: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
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
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      uploader: await RedditCloneMemberAtSummaryTransformer.transform(
        input.uploader,
      ),
      thumbnails: await ArrayUtil.asyncMap(input.thumbnails, async (thumb) => {
        const summary =
          await RedditCloneFileThumbnailAtSummaryTransformer.transform(thumb);
        return { items: summary } satisfies IRedditCloneFileThumbnail;
      }),
      scans: await ArrayUtil.asyncMap(
        input.scans,
        RedditCloneFileScanTransformer.transform,
      ),
      associations: input.fileAssociation
        ? [
            await RedditCloneFileAssociationAtSummaryTransformer.transform(
              input.fileAssociation,
            ),
          ]
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