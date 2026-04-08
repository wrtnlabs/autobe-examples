import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_communitiesGetPayload<
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
        updated_at: true,
        deleted_at: true,
        owner: RedditPlatformMemberAtSummaryTransformer.select(),
        snapshots: true,
        communityMemberships: {
          select: { id: true },
        } satisfies Prisma.reddit_platform_community_membersFindManyArgs,
        bannedUserRecords: true,
        subscriptions: true,
        posts: true,
        reports: true,
        banRecords: true,
        banRecordSnapshots: true,
      },
    } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_url: input.icon_url,
      subscriber_count: input.communityMemberships.length,
      owner: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformCommunity.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunityAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_communitiesGetPayload<ReturnType<typeof select>>;
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
//             updated_at: true,
//             deleted_at: true,
//             owner: RedditPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunity.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   icon_url: {string | null},
//   subscriber_count: {integer},
//   owner: await RedditPlatformMemberAtSummaryTransformer.transform(input.owner),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------