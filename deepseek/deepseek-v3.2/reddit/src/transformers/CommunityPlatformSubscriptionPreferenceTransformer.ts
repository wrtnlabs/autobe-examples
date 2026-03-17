import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformSubscriptionAtSummaryTransformer } from "./CommunityPlatformSubscriptionAtSummaryTransformer";

export namespace CommunityPlatformSubscriptionPreferenceTransformer {
  export type Payload =
    Prisma.community_platform_subscription_preferencesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        notify_new_posts: true,
        notify_new_comments: true,
        notify_mentions: true,
        show_in_home_feed: true,
        highlight_new_content: true,
        auto_expand_comments: true,
        sort_posts_by: true,
        sort_comments_by: true,
        subscription:
          CommunityPlatformSubscriptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_subscription_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSubscriptionPreference> {
    return {
      id: input.id,
      subscription:
        await CommunityPlatformSubscriptionAtSummaryTransformer.transform(
          input.subscription,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      notify_new_posts: input.notify_new_posts,
      notify_new_comments: input.notify_new_comments,
      notify_mentions: input.notify_mentions,
      show_in_home_feed: input.show_in_home_feed,
      highlight_new_content: input.highlight_new_content,
      auto_expand_comments: input.auto_expand_comments,
      sort_posts_by: input.sort_posts_by,
      sort_comments_by: input.sort_comments_by,
    };
  }
}
