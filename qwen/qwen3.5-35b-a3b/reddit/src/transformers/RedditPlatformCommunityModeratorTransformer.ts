import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommunityModeratorTransformer {
  export type Payload = Prisma.reddit_platform_community_membersGetPayload<{
    select: {
      id: true;
      role: true;
      joined_at: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      user: {
        select: {
          id: true;
          username: true;
          karma: true;
        };
      };
      community: true;
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        joined_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            karma: true,
          },
        },
        community: true,
      },
    } satisfies Prisma.reddit_platform_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityModerator> {
    return {
      id: input.user.id,
      username: input.user.username,
      karma: input.user.karma,
      assigned_at: input.joined_at.toISOString(),
    } satisfies IRedditPlatformCommunityModerator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunityModeratorTransformer {
//       export type Payload = Prisma.reddit_platform_community_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             joined_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user_id: true,
//             community_id: true,
//           },
//         } satisfies Prisma.reddit_platform_community_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunityModerator> {
//         return {
//   id: {string},
//   username: {string},
//   karma: {integer},
//   assigned_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------