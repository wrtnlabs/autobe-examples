import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSubscriptionPreferenceCollector {
  export async function collect(props: {
    body: ICommunityPlatformSubscriptionPreference.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      notify_new_posts: props.body.notifyNewPosts ?? true,
      notify_new_comments: props.body.notifyNewComments ?? true,
      notify_mentions: props.body.notifyMentions ?? true,
      show_in_home_feed: props.body.showInHomeFeed ?? true,
      highlight_new_content: props.body.highlightNewContent ?? false,
      auto_expand_comments: props.body.autoExpandComments ?? false,
      sort_posts_by: props.body.sortPostsBy ?? null,
      sort_comments_by: props.body.sortCommentsBy ?? null,
      // BelongsTo relation
      subscription: {
        connect: { id: props.body.communityPlatformSubscriptionId },
      },
    } satisfies Prisma.community_platform_subscription_preferencesCreateInput;
  }
}
