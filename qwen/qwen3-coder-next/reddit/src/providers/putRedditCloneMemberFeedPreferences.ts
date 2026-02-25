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

export async function putRedditCloneMemberFeedPreferences(props: {
  member: MemberPayload;
  body: IRedditCloneFeedPreference.IUpdate;
}): Promise<IRedditCloneFeedPreference> {
  const { member, body } = props;
  const existing =
    await MyGlobal.prisma.reddit_clone_feed_preferences.findFirst({
      where: {
        id: member.id,
        deleted_at: null,
      },
    });
  const created = await MyGlobal.prisma.reddit_clone_feed_preferences.upsert({
    where: {
      id: existing?.id || member.id,
    },
    update: {
      default_sort_algorithm:
        body.default_sort_algorithm !== undefined
          ? body.default_sort_algorithm
          : existing?.default_sort_algorithm,
      default_time_filter:
        body.default_time_filter !== undefined
          ? (body.default_time_filter as string & tags.Format<"date-time">)
          : existing?.default_time_filter,
      community_specific_enabled:
        body.community_specific_enabled !== undefined
          ? body.community_specific_enabled
          : existing?.community_specific_enabled,
      updated_at: toISOStringSafe(new Date()),
    },
    create: {
      id: member.id,
      default_sort_algorithm: body.default_sort_algorithm ?? "hot",
      default_time_filter: body.default_time_filter ?? null,
      community_specific_enabled: body.community_specific_enabled ?? false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return RedditCloneFeedPreferenceTransformer.transform(created);
}
