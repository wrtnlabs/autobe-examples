import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileThumbnailAtSummaryTransformer } from "./RedditCloneFileThumbnailAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneFileAtSummaryTransformer {
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
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_iconsFindManyArgs,
        postImages: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
        scans: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_file_scansFindManyArgs,
        thumbnails: RedditCloneFileThumbnailAtSummaryTransformer.select(),
        fileAssociation: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_file_associationsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFile.ISummary> {
    return {
      createdAt: toISOStringSafe(input.created_at),
      fileSize: input.file_size,
      id: input.id,
      mimeType: input.mime_type,
      originalFilename: input.original_filename,
      status: input.status,
      thumbnails: input.thumbnails?.length
        ? await ArrayUtil.asyncMap(
            input.thumbnails,
            async (thumb) =>
              ({
                items:
                  await RedditCloneFileThumbnailAtSummaryTransformer.transform(
                    thumb,
                  ),
              }) satisfies IRedditCloneFileThumbnail,
          )
        : undefined,
      uploader: await RedditCloneMemberAtSummaryTransformer.transform(
        input.uploader,
      ),
    } satisfies IRedditCloneFile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileAtSummaryTransformer {
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
//             ...
//           },
//         } satisfies Prisma.reddit_clone_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneFile.ISummary> {
//         return {
//   createdAt: {string},
//   fileSize: {integer},
//   id: {string},
//   mimeType: {string},
//   originalFilename: {string},
//   status: {string},
//   thumbnails: {Array<IRedditCloneFileThumbnail>},
//   uploader: await RedditCloneMemberAtSummaryTransformer.transform(input.uploader),
//         };
//       }
//     }
//--------------------------------------------------------------