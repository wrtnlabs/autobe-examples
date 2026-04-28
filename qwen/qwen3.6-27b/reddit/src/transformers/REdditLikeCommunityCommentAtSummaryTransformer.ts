import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        votes: {
          select: {
            direction: true,
          },
        } satisfies Prisma.reddit_like_community_comment_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_like_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityComment.ISummary> {
    const upvotes = input.votes.filter((v) => v.direction === "upvote").length;
    const downvotes = input.votes.filter(
      (v) => v.direction === "downvote",
    ).length;
    return {
      id: input.id,
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      content: input.content,
      vote_score: upvotes - downvotes,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommentAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_commentsGetPayload<ReturnType<typeof select>>;
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
//             post_id: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             parent_comment_id: true,
//           },
//         } satisfies Prisma.reddit_like_community_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityComment.ISummary> {
//         return {
//   id: {string},
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   content: {string},
//   vote_score: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------