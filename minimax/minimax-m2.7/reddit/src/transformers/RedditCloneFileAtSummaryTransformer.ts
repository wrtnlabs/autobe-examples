import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFileAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
    } satisfies Prisma.reddit_clone_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFile.ISummary> {
    return {
      id: input.id,
      originalFilename: input.original_filename,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      uploader: {
        id: input.uploader.id,
        username: input.uploader.username,
      } satisfies IRedditCloneMember.ISummary,
      thumbnails:
        input.thumbnails.length > 0
          ? input.thumbnails.map(
              (t) =>
                ({
                  items: {
                    id: t.id,
                    width: t.width,
                    height: t.height,
                    variant: t.variant,
                    thumbnailPath: t.thumbnail_path,
                    createdAt: t.created_at.toISOString(),
                  },
                }) satisfies IRedditCloneFileThumbnail,
            )
          : undefined,
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