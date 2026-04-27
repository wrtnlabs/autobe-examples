import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformVoteTransformer {
  export type Payload = Prisma.community_platform_votesGetPayload<
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
        voter: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVote> {
    return {
      id: input.id,
      voter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.voter,
      ),
      target_type: input.target_type,
      target_id: input.target_id,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformVoteTransformer {
//       export type Payload = Prisma.community_platform_votesGetPayload<ReturnType<typeof select>>;
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
//             voter: CommunityPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformVote> {
//         return {
//   id: {string},
//   voter: await CommunityPlatformMemberAtSummaryTransformer.transform(input.voter),
//   target_type: {string},
//   target_id: {string},
//   value: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------