import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditPlatformMemberAtSummaryTransformer.select(),
        posts: true,
        reports: true,
        subscriptions: true,
        moderators: true,
        moderationAuditLogs: true,
        moderatorHistories: true,
        bans: true,
      },
    } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      subscriber_count: input.subscriber_count,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
