import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityCommunityTransformer {
  export type Payload = Prisma.reddit_like_community_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        creator: REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunity> {
    return {
      id: input.id,
      creator: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.creator,
      ),
      name: input.name,
      description: input.description,
      icon_uri: input.icon_uri,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IREdditLikeCommunityCommunity;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityTransformer {
//       export type Payload = Prisma.reddit_like_community_communitiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             icon_uri: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             creator: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunity> {
//         return {
//   id: {string},
//   creator: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.creator),
//   name: {string},
//   description: {string},
//   icon_uri: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------