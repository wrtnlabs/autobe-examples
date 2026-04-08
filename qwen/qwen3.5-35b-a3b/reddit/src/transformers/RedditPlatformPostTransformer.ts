import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentTransformer } from "./RedditPlatformCommentTransformer";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostImageTransformer } from "./RedditPlatformPostImageTransformer";
import { RedditPlatformPostLinkTransformer } from "./RedditPlatformPostLinkTransformer";
import { RedditPlatformPostTextTransformer } from "./RedditPlatformPostTextTransformer";
import { RedditPlatformPostVoteTransformer } from "./RedditPlatformPostVoteTransformer";

export namespace RedditPlatformPostTransformer {
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
        textContent: RedditPlatformPostTextTransformer.select(),
        linkPost: RedditPlatformPostLinkTransformer.select(),
        image: RedditPlatformPostImageTransformer.select(),
        postVotes: RedditPlatformPostVoteTransformer.select(),
        comments: RedditPlatformCommentTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type as "text" | "link" | "image",
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      comment_count: input.comment_count,
      score: input.upvotes_count - input.downvotes_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      textContent: input.textContent
        ? await RedditPlatformPostTextTransformer.transform(input.textContent)
        : null,
      linkPost: input.linkPost
        ? await RedditPlatformPostLinkTransformer.transform(input.linkPost)
        : null,
      image: input.image
        ? await RedditPlatformPostImageTransformer.transform(input.image)
        : null,
      postVotes: await ArrayUtil.asyncMap(
        input.postVotes,
        RedditPlatformPostVoteTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        RedditPlatformCommentTransformer.transform,
      ),
    } satisfies IRedditPlatformPost;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostTransformer {
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
//             score: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPost> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {"text" | "link" | "image"},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   comment_count: {integer},
//   score: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   author: {IRedditPlatformMember.ISummary},
//   community: {IRedditPlatformCommunity.ISummary},
//   textContent: {IRedditPlatformPostText | null},
//   linkPost: {IRedditPlatformPostLink | null},
//   image: {IRedditPlatformPostImage | null},
//   postVotes: {Array<IRedditPlatformPostVote>},
//   comments: {Array<IRedditPlatformComment>},
//         };
//       }
//     }
//--------------------------------------------------------------