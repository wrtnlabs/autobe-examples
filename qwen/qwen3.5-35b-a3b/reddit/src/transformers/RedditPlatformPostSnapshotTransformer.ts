import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostTransformer } from "./RedditPlatformPostTransformer";

export namespace RedditPlatformPostSnapshotTransformer {
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
        upvotes_count: true,
        downvotes_count: true,
        score: true,
        comment_count: true,
        snapshot_type: true,
        created_at: true,
        post: RedditPlatformPostTransformer.select(),
        community_id: true,
        author_id: true,
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      content: input.content ?? null,
      post_type: input.post_type,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
      comment_count: input.comment_count,
      snapshot_type: input.snapshot_type,
      created_at: toISOStringSafe(input.created_at),
      post: await RedditPlatformPostTransformer.transform(input.post),
      community: await transformCommunity(input.community_id),
      author: await transformAuthor(input.author_id),
    } satisfies IRedditPlatformPostSnapshot;
  }
  async function transformCommunity(
    communityId: string,
  ): Promise<IRedditPlatformCommunity.ISummary> {
    const result = await MyGlobal.prisma.reddit_platform_communities.findUnique(
      {
        where: { id: communityId },
        ...RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    );
    if (!result) {
      throw new Error(`Community not found: ${communityId}`);
    }
    return RedditPlatformCommunityAtSummaryTransformer.transform(result);
  }
  async function transformAuthor(
    authorId: string,
  ): Promise<IRedditPlatformMember.ISummary> {
    const result = await MyGlobal.prisma.reddit_platform_members.findUnique({
      where: { id: authorId },
      ...RedditPlatformMemberAtSummaryTransformer.select(),
    });
    if (!result) {
      throw new Error(`Author not found: ${authorId}`);
    }
    return RedditPlatformMemberAtSummaryTransformer.transform(result);
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostSnapshotTransformer {
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
//             upvotes_count: true,
//             downvotes_count: true,
//             score: true,
//             comment_count: true,
//             snapshot_type: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostSnapshot> {
//         return {
//   id: {string},
//   title: {string},
//   content: {string | null},
//   post_type: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_count: {integer},
//   snapshot_type: {string},
//   created_at: {string},
//   post: {IRedditPlatformPost},
//   community: {IRedditPlatformCommunity.ISummary},
//   author: {IRedditPlatformMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------