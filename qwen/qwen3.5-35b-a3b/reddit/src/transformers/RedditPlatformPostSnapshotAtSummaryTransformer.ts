import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        post_type: true,
        community_id: true,
        author_id: true,
        upvotes_count: true,
        downvotes_count: true,
        score: true,
        comment_count: true,
        snapshot_type: true,
        created_at: true,
        post: {
          select: {
            author: RedditPlatformMemberAtSummaryTransformer.select(),
            community: RedditPlatformCommunityAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_platform_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      content: input.content ?? null,
      post_type: input.post_type,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.post.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.post.community,
      ),
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
      comment_count: input.comment_count,
      snapshot_type: input.snapshot_type,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditPlatformPostSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_post_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             content: true,
//             post_type: true,
//             community_id: true,
//             author_id: true,
//             upvotes_count: true,
//             downvotes_count: true,
//             score: true,
//             comment_count: true,
//             snapshot_type: true,
//             created_at: true,
//             reddit_platform_post_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostSnapshot.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   content: {string | null},
//   post_type: {string},
//   author: {IRedditPlatformMember.ISummary},
//   community: {IRedditPlatformCommunity.ISummary},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_count: {integer},
//   snapshot_type: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------