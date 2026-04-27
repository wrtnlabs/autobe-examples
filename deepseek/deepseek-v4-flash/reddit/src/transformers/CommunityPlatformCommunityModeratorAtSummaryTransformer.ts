import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityModeratorAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        appointedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityModerator.ISummary> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      appointedBy: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.appointedBy,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunityModerator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityModeratorAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_community_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             community_platform_member_id: true,
//             community_platform_community_id: true,
//             appointed_by_member_id: true,
//             ...
//           },
//         } satisfies Prisma.community_platform_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunityModerator.ISummary> {
//         return {
//   id: {string},
//   member: {ICommunityPlatformMember.ISummary},
//   appointedBy: {ICommunityPlatformMember.ISummary},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------