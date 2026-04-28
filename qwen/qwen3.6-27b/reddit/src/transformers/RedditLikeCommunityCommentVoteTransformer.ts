import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "./REdditLikeCommunityCommentAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityCommentVoteTransformer {
  export type Payload = Prisma.reddit_like_community_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityCommentVote> {
    return {
      id: input.id,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityCommentVoteTransformer {
//       export type Payload = Prisma.reddit_like_community_comment_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             direction: true,
//             created_at: true,
//             updated_at: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_comment_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityCommentVote> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(input.comment),
//   direction: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------