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

export namespace REdditLikeCommunityCommunityAtSummaryTransformer {
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
        creator: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        subscriptions: {
          select: {
            is_active: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_like_community_community_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_uri: input.icon_uri,
      created_at: input.created_at.toISOString(),
      creator: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.creator,
      ),
      subscriber_count: input.subscriptions.filter(
        (s) => s.is_active && s.deleted_at === null,
      ).length,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunity.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   icon_uri: {string | null},
//   created_at: {string},
//   creator: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.creator),
//   subscriber_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------