import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityIconAtInvertTransformer } from "./RedditCloneCommunityIconAtInvertTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommunityAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        icon: RedditCloneCommunityIconAtInvertTransformer.select(),
        communityModerators: {
          select: {},
        } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs,
        communityBans: {
          select: {},
        } satisfies Prisma.reddit_clone_community_bansFindManyArgs,
        communityReports: {
          select: {},
        } satisfies Prisma.reddit_clone_community_reportsFindManyArgs,
        subscriptions: {
          select: {},
        } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs,
        posts: {
          select: {},
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        moderators: {
          select: {},
        } satisfies Prisma.reddit_clone_moderatorsFindManyArgs,
        moderatorSnapshots: {
          select: {},
        } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs,
        bans: {
          select: {},
        } satisfies Prisma.reddit_clone_bansFindManyArgs,
        reports: {
          select: {},
        } satisfies Prisma.reddit_clone_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity.IInvert> {
    if (input.icon === null)
      throw new HttpException("Community icon is required", 500);
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      subscriberCount: input.subscriber_count,
      owner: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      icon: await RedditCloneCommunityIconAtInvertTransformer.transform(
        input.icon,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditCloneCommunity.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_communitiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             subscriber_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             icon: RedditCloneCommunityIconAtInvertTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunity.IInvert> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   subscriberCount: {integer},
//   owner: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   icon: await RedditCloneCommunityIconAtInvertTransformer.transform(input.icon),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------