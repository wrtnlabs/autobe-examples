import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformVoteSummaryAtSummaryTransformer {
  export type Payload = Prisma.community_platform_vote_summariesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        upvote_count: true,
        downvote_count: true,
        net_score: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_vote_summariesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVoteSummary.ISummary> {
    return {
      id: input.id,
      target_type: input.target_type,
      target_id: input.target_id,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      net_score: input.net_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformVoteSummary.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformVoteSummaryAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_vote_summariesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             upvote_count: true,
//             downvote_count: true,
//             net_score: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.community_platform_vote_summariesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformVoteSummary.ISummary> {
//         return {
//   id: {string},
//   target_type: {string},
//   target_id: {string},
//   upvote_count: {integer},
//   downvote_count: {integer},
//   net_score: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------