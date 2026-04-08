import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommunitySnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        community: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunitySnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_url: input.icon_url,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditPlatformCommunitySnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunitySnapshotAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_community_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             icon_url: true,
//             created_at: true,
//             community_id: true,
//           },
//         } satisfies Prisma.reddit_platform_community_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunitySnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   icon_url: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------