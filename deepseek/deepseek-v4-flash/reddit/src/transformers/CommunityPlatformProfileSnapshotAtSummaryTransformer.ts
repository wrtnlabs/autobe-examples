import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformProfileAtSummaryTransformer } from "./CommunityPlatformProfileAtSummaryTransformer";

export namespace CommunityPlatformProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_member_id: true,
        display_name: true,
        biography: true,
        avatar: true,
        karma: true,
        created_at: true,
        profile: CommunityPlatformProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformProfileSnapshot.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      biography: input.biography ?? null,
      avatar: input.avatar ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      member_id: input.community_platform_member_id,
      profile: await CommunityPlatformProfileAtSummaryTransformer.transform(
        input.profile,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformProfileSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_profile_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             community_platform_member_id: true,
//             display_name: true,
//             biography: true,
//             avatar: true,
//             karma: true,
//             created_at: true,
//             profile: CommunityPlatformProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformProfileSnapshot.ISummary> {
//         return {
//   id: {string},
//   display_name: {string},
//   biography: {string | null},
//   avatar: {string | null},
//   karma: {integer},
//   created_at: {string},
//   member_id: {string},
//   profile: await CommunityPlatformProfileAtSummaryTransformer.transform(input.profile),
//         };
//       }
//     }
//--------------------------------------------------------------