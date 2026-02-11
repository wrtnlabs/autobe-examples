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

export async function getRedditPlatformMemberPreferencesMy(props: {
  member: MemberPayload;
}): Promise<IRedditPlatformFeedPreference> {
  const preferences =
    await MyGlobal.prisma.reddit_platform_feed_preferences.findUnique({
      where: { member_id: props.member.id },
      ...RedditPlatformFeedPreferenceTransformer.select(),
    });
  if (!preferences) {
    // Return default preference values when user has no preferences yet
    return {
      id: props.member.id as string & tags.Format<"uuid">, // Use member ID as fallback ID
      member: {
        id: props.member.id,
        username: "",
        displayName: null,
        avatarUrl: null,
      },
      defaultFeedType: "HOME",
      defaultSortOrder: "TOP",
      homeFeedSubscribedOnly: false,
      contentKarmaThreshold: undefined,
      showNsfw: false,
      theme: "system",
      interfaceDensity: "normal",
      contentLanguage: null,
      hideMutedCommunities: false,
      autoExpandMedia: false,
      infiniteScroll: true,
      commentSortOrder: "TOP",
      showCommunityRecommendations: true,
      showTrendingTopics: true,
      enableRecommendations: true,
      updatedAt: toISOStringSafe(new Date()),
      createdAt: toISOStringSafe(new Date()),
    };
  }
  return await RedditPlatformFeedPreferenceTransformer.transform(preferences);
}
