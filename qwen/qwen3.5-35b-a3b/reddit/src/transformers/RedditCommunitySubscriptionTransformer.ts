import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunitySubscriptionTransformer {
  export type Payload = Prisma.reddit_community_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.reddit_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySubscription> {
    return {
      id: input.id,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunitySubscription;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunitySubscriptionTransformer {
//       export type Payload = Prisma.reddit_community_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditCommunityMemberAtSummaryTransformer.select(),
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunitySubscription> {
//         return {
//   id: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: await RedditCommunityMemberAtSummaryTransformer.transform(input.member),
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------