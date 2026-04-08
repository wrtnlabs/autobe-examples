import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneSubscriptionAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneSubscription.IInvert> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCloneSubscription.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneSubscriptionAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneSubscription.IInvert> {
//         return {
//   id: {string},
//   createdAt: {string},
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------