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

export namespace CommunityHubCommunityModeratorTransformer {
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
  ): Promise<ICommunityHubCommunityModerator> {
    return {
      id: input.id,
      role: input.role,
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      addedByMember: input.addedByMember
        ? await CommunityHubMemberAtSummaryTransformer.transform(
            input.addedByMember,
          )
        : null,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubCommunityModerator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunityModeratorTransformer {
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
//       export async function transform(input: Payload): Promise<ICommunityHubCommunityModerator> {
//         return {
//   id: {string},
//   role: {string},
//   member: {ICommunityHubMember.ISummary},
//   addedByMember: {ICommunityHubMember.ISummary | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------