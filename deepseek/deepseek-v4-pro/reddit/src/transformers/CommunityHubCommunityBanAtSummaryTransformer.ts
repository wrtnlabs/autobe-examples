import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
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

export namespace CommunityHubCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.community_hub_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedMember: CommunityHubMemberAtSummaryTransformer.select(),
        issuedBy: CommunityHubMemberAtSummaryTransformer.select(),
        unbannedBy: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubCommunityBan.ISummary> {
    return {
      id: input.id,
      bannedMember: await CommunityHubMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      reason: input.reason,
      issuedBy: await CommunityHubMemberAtSummaryTransformer.transform(
        input.issuedBy,
      ),
      unbannedBy: input.unbannedBy
        ? await CommunityHubMemberAtSummaryTransformer.transform(
            input.unbannedBy,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityHubCommunityBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunityBanAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_community_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             unbanned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community_hub_member_id: true,
//             community_hub_community_id: true,
//             issued_by_id: true,
//             unbanned_by_id: true,
//             ...
//           },
//         } satisfies Prisma.community_hub_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubCommunityBan.ISummary> {
//         return {
//   id: {string},
//   bannedMember: {ICommunityHubMember.ISummary},
//   reason: {string | null},
//   issuedBy: {ICommunityHubMember.ISummary},
//   unbannedBy: {ICommunityHubMember.ISummary | null},
//   created_at: {string},
//   updated_at: {string},
//   unbanned_at: {string | null},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------