import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostAtSummaryTransformer {
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
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        author: RedditPlatformMemberAtSummaryTransformer.select(),
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
  ): Promise<IRedditPlatformPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      comment_count: input.comment_count,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformPost.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostAtSummaryTransformer {
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
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//             author: RedditPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPost.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   comment_count: {integer},
//   author: await RedditPlatformMemberAtSummaryTransformer.transform(input.author),
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------