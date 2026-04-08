import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentVoteTransformer {
  export type Payload = Prisma.reddit_platform_comment_votesGetPayload<
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
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        comment: RedditPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentVote> {
    return {
      id: input.id,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: await RedditPlatformCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      vote_type: input.vote_type as "up" | "down" | null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditPlatformCommentVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentVoteTransformer {
//       export type Payload = Prisma.reddit_platform_comment_votesGetPayload<ReturnType<typeof select>>;
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
//             ...
//           },
//         } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommentVote> {
//         return {
//   id: {string},
//   member: {IRedditPlatformMember.ISummary},
//   comment: {IRedditPlatformComment.ISummary},
//   vote_type: {"up" | "down" | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------