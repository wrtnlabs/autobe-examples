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
        uploader: RedditCloneMemberAtSummaryTransformer.select(),
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
        fileAssociation:
          RedditCloneFileAssociationAtSummaryTransformer.select(),
        scans: RedditCloneFileScanTransformer.select(),
        thumbnails: RedditCloneFileThumbnailAtSummaryTransformer.select(),
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
      uploader: await RedditCloneMemberAtSummaryTransformer.transform(
        input.uploader,
      ),
      associations: input.fileAssociation
        ? [
            await RedditCloneFileAssociationAtSummaryTransformer.transform(
              input.fileAssociation,
            ),
          ]
        : [],
      scans: await ArrayUtil.asyncMap(
        input.scans,
        RedditCloneFileScanTransformer.transform,
      ),
      thumbnails: await ArrayUtil.asyncMap(
        input.thumbnails,
        async (thumbnail) =>
          typia.assert<IRedditCloneFileThumbnail>(
            await RedditCloneFileThumbnailAtSummaryTransformer.transform(
              thumbnail,
            ),
          ),
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
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
//             originalFilename: true,
//             storedFilename: true,
//             mimeType: true,
//             fileSize: true,
//             storagePath: true,
//             status: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
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
//   uploader: {IRedditCloneMember.ISummary},
//   associations: {Array<IRedditCloneFileAssociation.ISummary>},
//   scans: {Array<IRedditCloneFileScan>},
//   thumbnails: {Array<IRedditCloneFileThumbnail>},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------