import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunitySnapshotAtSummaryTransformer {
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
        subscriber_count: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_image_uri: input.icon_image_uri ?? null,
      subscriber_count: input.subscriber_count,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunitySnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunitySnapshotAtSummaryTransformer {
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
//             community_platform_community_id: true,
//           },
//         } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunitySnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   icon_image_uri: {string | null},
//   subscriber_count: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------