import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFileThumbnailAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_file_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        variant: true,
        thumbnail_path: true,
        created_at: true,
        updated_at: true,
        file: true,
      },
    } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileThumbnail.ISummary> {
    return {
      id: input.id,
      width: input.width,
      height: input.height,
      variant: input.variant,
      thumbnailPath: input.thumbnail_path,
      createdAt: input.created_at.toISOString(),
    } satisfies IRedditCloneFileThumbnail.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileThumbnailAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_file_thumbnailsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             width: true,
//             height: true,
//             variant: true,
//             thumbnail_path: true,
//             created_at: true,
//             updated_at: true,
//             reddit_clone_file_id: true,
//           },
//         } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneFileThumbnail.ISummary> {
//         return {
//   id: {string},
//   width: {integer},
//   height: {integer},
//   variant: {string},
//   thumbnailPath: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------