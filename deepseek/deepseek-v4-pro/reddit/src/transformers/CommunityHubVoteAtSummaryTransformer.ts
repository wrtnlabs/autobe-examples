import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubVoteAtSummaryTransformer {
  export type Payload = Prisma.community_hub_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        value: true,
        created_at: true,
        updated_at: true,
        member: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubVote.ISummary> {
    return {
      id: input.id,
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      target_type: input.target_type,
      target_id: input.target_id,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityHubVote.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubVoteAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             value: true,
//             created_at: true,
//             updated_at: true,
//             member: CommunityHubMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubVote.ISummary> {
//         return {
//   id: {string},
//   member: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//   target_type: {string},
//   target_id: {string},
//   value: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------