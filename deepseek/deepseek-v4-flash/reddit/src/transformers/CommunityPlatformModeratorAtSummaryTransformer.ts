import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformModeratorAtSummaryTransformer {
  export type Payload = Prisma.community_platform_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        appointedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerator.ISummary> {
    return {
      id: input.id,
      role: input.role,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      appointed_by:
        input.appointedBy !== null
          ? await CommunityPlatformMemberAtSummaryTransformer.transform(
              input.appointedBy,
            )
          : null,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformModerator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformModeratorAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             updated_at: true,
//             member_id: true,
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//             appointed_by_member_id: true,
//             ...
//           },
//         } satisfies Prisma.community_platform_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformModerator.ISummary> {
//         return {
//   id: {string},
//   role: {string},
//   member: {ICommunityPlatformMember.ISummary},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   appointed_by: {ICommunityPlatformMember.ISummary | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------