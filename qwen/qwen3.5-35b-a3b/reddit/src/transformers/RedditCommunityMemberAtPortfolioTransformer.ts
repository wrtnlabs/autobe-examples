import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityMemberAtPortfolioTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        session: true,
        passwordResetRequests: true,
        emailVerification: true,
        subscriptions: true,
        posts: RedditCommunityPostAtSummaryTransformer.select(),
        postSnapshots: true,
        postVotes: true,
        comments: RedditCommunityCommentAtSummaryTransformer.select(),
        commentVotes: true,
        postReports: true,
        commentReports: true,
        moderatorRoles: true,
        banRecords: true,
        bansIssueds: true,
        reports: true,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.IPortfolio> {
    const postVoteScore = input.postVotes.reduce((sum, vote) => {
      return sum + (vote.vote_type === "upvote" ? 1 : -1);
    }, 0);
    const commentVoteScore = input.commentVotes.reduce((sum, vote) => {
      return sum + (vote.vote_type === "upvote" ? 1 : -1);
    }, 0);
    return {
      id: input.id,
      username: input.username,
      karmaScore: postVoteScore + commentVoteScore,
      posts: await ArrayUtil.asyncMap(
        input.posts,
        RedditCommunityPostAtSummaryTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        RedditCommunityCommentAtSummaryTransformer.transform,
      ),
    } satisfies IRedditCommunityMember.IPortfolio;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberAtPortfolioTransformer {
//       export type Payload = Prisma.reddit_community_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             username: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             posts: RedditCommunityPostAtSummaryTransformer.select(),
//             comments: RedditCommunityCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityMember.IPortfolio> {
//         return {
//   id: {string},
//   username: {string},
//   karmaScore: {integer},
//   posts: await ArrayUtil.asyncMap(input.posts, RedditCommunityPostAtSummaryTransformer.transform),
//   comments: await ArrayUtil.asyncMap(input.comments, RedditCommunityCommentAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------