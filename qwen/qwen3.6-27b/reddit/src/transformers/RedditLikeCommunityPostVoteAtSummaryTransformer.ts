import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityPostVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_post_votesGetPayload<
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
        post: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostVote.ISummary> {
    return {
      id: input.id,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IRedditLikeCommunityPostVote.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostVoteAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_post_votesGetPayload<ReturnType<typeof select>>;
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
//             reddit_like_community_post_id: true,
//           },
//         } satisfies Prisma.reddit_like_community_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostVote.ISummary> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   direction: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------