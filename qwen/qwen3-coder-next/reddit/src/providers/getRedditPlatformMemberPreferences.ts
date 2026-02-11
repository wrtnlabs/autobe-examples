import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformFeedPreferenceTransformer } from "../transformers/RedditPlatformFeedPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberPreferences(props: {
  member: MemberPayload;
}): Promise<IRedditPlatformFeedPreference> {
  const preference =
    await MyGlobal.prisma.reddit_platform_feed_preferences.findUnique({
      where: { member_id: props.member.id },
      ...RedditPlatformFeedPreferenceTransformer.select(),
    });
  if (!preference) {
    const created =
      await MyGlobal.prisma.reddit_platform_feed_preferences.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          default_feed_type: "HOME",
          default_sort_order: "TOP",
          home_feed_subscribed_only: false,
          show_nsfw: false,
          theme: "system",
          interface_density: "normal",
          hide_muted_communities: true,
          auto_expand_media: false,
          infinite_scroll: true,
          comment_sort_order: "TOP",
          show_community_recommendations: true,
          show_trending_topics: true,
          enable_recommendations: true,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        ...RedditPlatformFeedPreferenceTransformer.select(),
      });
    return await RedditPlatformFeedPreferenceTransformer.transform(created);
  }
  return await RedditPlatformFeedPreferenceTransformer.transform(preference);
}
