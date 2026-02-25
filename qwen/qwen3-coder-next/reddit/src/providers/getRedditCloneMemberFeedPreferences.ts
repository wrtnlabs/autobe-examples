import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFeedPreferenceTransformer } from "../transformers/RedditCloneFeedPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberFeedPreferences(props: {
  member: MemberPayload;
}): Promise<IRedditCloneFeedPreference> {
  const preferenceOfMember =
    await MyGlobal.prisma.reddit_clone_feed_preference_of_members.findFirst({
      where: {
        member_id: props.member.id satisfies string as string,
      },
      select: {
        feed_preference_id: true,
      },
    });
  if (!preferenceOfMember) {
    throw new HttpException("Feed preference not found", 404);
  }
  const feedPreference =
    await MyGlobal.prisma.reddit_clone_feed_preferences.findUnique({
      where: {
        id: preferenceOfMember.feed_preference_id satisfies string as string,
        deleted_at: null,
      },
      ...RedditCloneFeedPreferenceTransformer.select(),
    });
  if (!feedPreference) {
    throw new HttpException("Feed preference not found", 404);
  }
  return await RedditCloneFeedPreferenceTransformer.transform(feedPreference);
}
