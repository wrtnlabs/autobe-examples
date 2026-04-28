import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace REdditLikeCommunityProfileAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_community_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityProfile.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    } satisfies IREdditLikeCommunityProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityProfileAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             bio: true,
//             karma: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reddit_like_community_member_id: true,
//           },
//         } satisfies Prisma.reddit_like_community_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityProfile.ISummary> {
//         return {
//   id: {string},
//   display_name: {string | null},
//   bio: {string | null},
//   karma: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------