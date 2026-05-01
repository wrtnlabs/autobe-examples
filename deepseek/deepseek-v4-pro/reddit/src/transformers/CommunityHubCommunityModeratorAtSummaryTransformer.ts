import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubCommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.community_hub_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        community: {
          select: { id: true },
        } satisfies Prisma.community_hub_communitiesFindManyArgs,
        member: CommunityHubMemberAtSummaryTransformer.select(),
        addedByMember: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubCommunityModerator.ISummary> {
    return {
      id: input.id,
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: input.role,
      created_at: input.created_at.toISOString(),
      added_by: input.addedByMember
        ? await CommunityHubMemberAtSummaryTransformer.transform(
            input.addedByMember,
          )
        : null,
    } satisfies ICommunityHubCommunityModerator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunityModeratorAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_community_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             community_hub_community_id: true,
//             community_hub_member_id: true,
//             added_by_community_hub_member_id: true,
//             ...
//           },
//         } satisfies Prisma.community_hub_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubCommunityModerator.ISummary> {
//         return {
//   id: {string},
//   member: {ICommunityHubMember.ISummary},
//   role: {string},
//   created_at: {string},
//   added_by: {ICommunityHubMember.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------