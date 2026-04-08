import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentVoteTransformer {
  export type Payload = Prisma.reddit_community_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        comment: RedditCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentVote> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: await RedditCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityCommentVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityCommentVoteTransformer {
//       export type Payload = Prisma.reddit_community_comment_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             vote_type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditCommunityMemberAtSummaryTransformer.select(),
//             comment: RedditCommunityCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_comment_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityCommentVote> {
//         return {
//   id: {string},
//   vote_type: {string},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.member),
//   comment: await RedditCommunityCommentAtSummaryTransformer.transform(input.comment),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------