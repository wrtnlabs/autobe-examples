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

export namespace RedditPlatformCommunityTransformer {
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
        _count: {
          select: {
            posts: true,
          },
        },
        posts: {
          select: {
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
        communityMemberships: true,
        snapshots: true,
        bannedUserRecords: true,
        subscriptions: true,
        reports: true,
        banRecords: true,
        banRecordSnapshots: true,
      },
    } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunity> {
    const subscribersCount = input.communityMemberships.filter(
      (membership) => membership.role === "member",
    ).length;
    const totalComments = input.posts.reduce(
      (sum, post) => sum + post._count.comments,
      0,
    );
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      owner: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscribers_count: subscribersCount,
      posts_count: input._count.posts,
      comments_count: totalComments,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformCommunity;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunityTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunity> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   icon_url: {string | null},
//   owner: await RedditPlatformMemberAtSummaryTransformer.transform(input.owner),
//   subscribers_count: {integer},
//   posts_count: {integer},
//   comments_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------