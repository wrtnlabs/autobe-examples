import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
import { CommunityHubCommunityAtSummaryTransformer } from "./CommunityHubCommunityAtSummaryTransformer";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubCommunityBanTransformer {
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
        community: CommunityHubCommunityAtSummaryTransformer.select(),
        issuedBy: CommunityHubMemberAtSummaryTransformer.select(),
        unbannedBy: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubCommunityBan> {
    return {
      id: input.id,
      bannedMember: await CommunityHubMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      community: await CommunityHubCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      issuedBy: await CommunityHubMemberAtSummaryTransformer.transform(
        input.issuedBy,
      ),
      unbannedBy: input.unbannedBy
        ? await CommunityHubMemberAtSummaryTransformer.transform(
            input.unbannedBy,
          )
        : null,
      reason: input.reason,
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityHubCommunityBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunityBanTransformer {
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
//             community: CommunityHubCommunityAtSummaryTransformer.select(),
//             issued_by_id: true,
//             unbanned_by_id: true,
//             ...
//           },
//         } satisfies Prisma.community_hub_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubCommunityBan> {
//         return {
//   id: {string},
//   bannedMember: {ICommunityHubMember.ISummary},
//   community: await CommunityHubCommunityAtSummaryTransformer.transform(input.community),
//   issuedBy: {ICommunityHubMember.ISummary},
//   unbannedBy: {ICommunityHubMember.ISummary | null},
//   reason: {string | null},
//   unbanned_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------