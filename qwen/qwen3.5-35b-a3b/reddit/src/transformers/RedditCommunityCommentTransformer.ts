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
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityCommentTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditCommunityPostAtSummaryTransformer.select(),
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        parent: RedditCommunityCommentAtSummaryTransformer.select(),
        votes: {
          select: {
            vote_type: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment> {
    // Compute votes_count from votes relation (only active votes)
    const activeVotes = input.votes.filter((v) => v.deleted_at === null);
    const votesCount = activeVotes.reduce((sum, vote) => {
      return vote.vote_type === "upvote" ? sum + 1 : sum - 1;
    }, 0);
    // Handle parent relation (self-join) - optional field returns undefined when null
    const parent = input.parent
      ? await RedditCommunityCommentAtSummaryTransformer.transform(input.parent)
      : undefined;
    return {
      id: input.id,
      content: input.content,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
      parent,
      votes_count: votesCount,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityComment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityCommentTransformer {
//       export type Payload = Prisma.reddit_community_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: RedditCommunityPostAtSummaryTransformer.select(),
//             author: RedditCommunityMemberAtSummaryTransformer.select(),
//             reddit_community_comment_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityComment> {
//         return {
//   id: {string},
//   content: {string},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.author),
//   post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
//   parent: {IRedditCommunityComment.ISummary | null},
//   votes_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------