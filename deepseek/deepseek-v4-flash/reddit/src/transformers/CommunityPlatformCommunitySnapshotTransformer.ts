import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";

export namespace CommunityPlatformCommunitySnapshotTransformer {
  export type Payload = Prisma.community_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_image_uri: true,
        owner_member_id: true,
        subscriber_count: true,
        created_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      name: input.name,
      description: input.description,
      icon_image_uri: input.icon_image_uri ?? null,
      owner_member_id: input.owner_member_id,
      subscriber_count: input.subscriber_count,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunitySnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunitySnapshotTransformer {
//       export type Payload = Prisma.community_platform_community_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             icon_image_uri: true,
//             owner_member_id: true,
//             subscriber_count: true,
//             created_at: true,
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunitySnapshot> {
//         return {
//   id: {string},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   name: {string},
//   description: {string},
//   icon_image_uri: {string | null},
//   owner_member_id: {string},
//   subscriber_count: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------