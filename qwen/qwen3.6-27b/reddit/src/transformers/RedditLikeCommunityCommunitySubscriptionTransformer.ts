import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityCommunitySubscriptionTransformer {
  // 1. Payload type first
  export type Payload =
    Prisma.reddit_like_community_community_subscriptionsGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        joined_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_community_subscriptionsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityCommunitySubscription> {
    return {
      id: input.id,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      joined_at: input.joined_at.toISOString(),
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikeCommunityCommunitySubscription;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityCommunitySubscriptionTransformer {
//       export type Payload = Prisma.reddit_like_community_community_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             joined_at: true,
//             is_active: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_community_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityCommunitySubscription> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   joined_at: {string},
//   is_active: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------