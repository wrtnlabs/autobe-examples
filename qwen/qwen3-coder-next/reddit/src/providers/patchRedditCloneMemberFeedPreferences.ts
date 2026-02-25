import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedPreferenceOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreferenceOfMember";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFeedPreferenceOfMemberTransformer } from "../transformers/RedditCloneFeedPreferenceOfMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberFeedPreferences(props: {
  member: MemberPayload;
  body: IRedditCloneFeedPreferenceOfMember.IUpdate;
}): Promise<IRedditCloneFeedPreferenceOfMember> {
  // Validate input values
  if (props.body.default_sort_algorithm !== undefined) {
    const validAlgorithms = ["hot", "new", "top", "controversial"];
    if (!validAlgorithms.includes(props.body.default_sort_algorithm)) {
      throw new HttpException("Invalid sort algorithm", 400);
    }
  }
  if (
    props.body.default_time_filter !== undefined &&
    props.body.default_time_filter !== null
  ) {
    const validFilters = [
      "today",
      "this_week",
      "this_month",
      "this_year",
      "all_time",
    ];
    if (!validFilters.includes(props.body.default_time_filter)) {
      throw new HttpException("Invalid time filter", 400);
    }
  }
  const now = toISOStringSafe(new Date());
  // Find existing preference for member
  const existingPreference =
    await MyGlobal.prisma.reddit_clone_feed_preference_of_members.findFirst({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  let preferenceId: string;
  if (existingPreference) {
    // Update existing preference
    const updatedPreference =
      await MyGlobal.prisma.reddit_clone_feed_preferences.update({
        where: {
          id: existingPreference.feed_preference_id,
        },
        data: {
          default_sort_algorithm: props.body.default_sort_algorithm ?? "hot",
          default_time_filter: props.body.default_time_filter ?? "all_time",
          community_specific_enabled:
            props.body.community_specific_enabled ?? false,
          updated_at: now,
        },
      });
    preferenceId = updatedPreference.id;
  } else {
    // Create new preference
    const newPreference =
      await MyGlobal.prisma.reddit_clone_feed_preferences.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          default_sort_algorithm: props.body.default_sort_algorithm ?? "hot",
          default_time_filter: props.body.default_time_filter ?? "all_time",
          community_specific_enabled:
            props.body.community_specific_enabled ?? false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    preferenceId = newPreference.id;
    // Create the member-specific preference record
    await MyGlobal.prisma.reddit_clone_feed_preference_of_members.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        feed_preference_id: preferenceId,
        member_id: props.member.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Retrieve updated preference with transformer
  const preferenceRecord =
    await MyGlobal.prisma.reddit_clone_feed_preference_of_members.findFirst({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      ...RedditCloneFeedPreferenceOfMemberTransformer.select(),
    });
  if (!preferenceRecord) {
    throw new HttpException("Failed to retrieve updated preference", 500);
  }
  return await RedditCloneFeedPreferenceOfMemberTransformer.transform(
    preferenceRecord,
  );
}
