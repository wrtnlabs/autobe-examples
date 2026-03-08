import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityBanTransformer } from "./RedditPlatformCommunityBanTransformer";
import { RedditPlatformCommunityModeratorTransformer } from "./RedditPlatformCommunityModeratorTransformer";
import { RedditPlatformCommunitySubscriptionTransformer } from "./RedditPlatformCommunitySubscriptionTransformer";
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
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditPlatformMemberAtSummaryTransformer.select(),
        posts: true,
        reports: true,
        subscriptions: RedditPlatformCommunitySubscriptionTransformer.select(),
        moderators: RedditPlatformCommunityModeratorTransformer.select(),
        moderationAuditLogs: true,
        moderatorHistories: true,
        bans: RedditPlatformCommunityBanTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      subscriber_count: input.subscriber_count,
      owner: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriptions: await ArrayUtil.asyncMap(
        input.subscriptions,
        RedditPlatformCommunitySubscriptionTransformer.transform,
      ),
      moderators: await ArrayUtil.asyncMap(
        input.moderators,
        RedditPlatformCommunityModeratorTransformer.transform,
      ),
      bans: await ArrayUtil.asyncMap(
        input.bans,
        RedditPlatformCommunityBanTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
