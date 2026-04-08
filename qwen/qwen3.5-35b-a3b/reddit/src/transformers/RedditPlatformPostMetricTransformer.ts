import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostMetricTransformer {
  export type Payload = Prisma.reddit_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        upvotes_count: true,
        downvotes_count: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: true,
        author: true,
        snapshots: true,
        textContent: true,
        linkPost: true,
        image: true,
        comments: true,
        postVotes: true,
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostMetric> {
    return {
      id: input.id,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.upvotes_count - input.downvotes_count,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      isDeleted: input.deleted_at !== null,
    } satisfies IRedditPlatformPostMetric;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostMetricTransformer {
//       export type Payload = Prisma.reddit_platform_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             post_type: true,
//             upvotes_count: true,
//             downvotes_count: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community_id: true,
//             author_id: true,
//           },
//         } satisfies Prisma.reddit_platform_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostMetric> {
//         return {
//   id: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   isDeleted: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------