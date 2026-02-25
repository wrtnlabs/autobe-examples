import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeedPreference";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedPreference";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberPreferences(props: {
  member: MemberPayload;
  body: IRedditFeedPreference.IRequest;
}): Promise<IPageIRedditFeedPreference.ISummary> {
  const [feed, sortOption] = await Promise.all([
    MyGlobal.prisma.reddit_feeds.findUnique({
      where: { id: props.body.feed_id },
    }),
    MyGlobal.prisma.reddit_feed_sorting_options.findUnique({
      where: { id: props.body.sort_order_id },
    }),
  ]);
  if (!feed) throw new HttpException("Feed not found", 404);
  if (!sortOption) throw new HttpException("Sort option not found", 404);
  const preference = await MyGlobal.prisma.reddit_feed_preferences.findUnique({
    where: { user_id: props.member.id },
  });
  const updatedPreference =
    await MyGlobal.prisma.reddit_feed_preferences.update({
      where: { id: preference?.id },
      data: {
        feed_id: props.body.feed_id,
        sort_order_id: props.body.sort_order_id,
        updated_at: new Date(),
      },
    });
  const fullPreference =
    await MyGlobal.prisma.reddit_feed_preferences.findUnique({
      where: { id: updatedPreference.id },
      include: {
        feed: {
          include: {
            sortingOption: true,
          },
        },
        sortOrder: true,
        user: true,
      },
    });
  if (!fullPreference) throw new HttpException("Preference not found", 404);
  return {
    data: [
      {
        id: fullPreference.id,
        sortOrder: {
          id: fullPreference.sortOrder.id,
          sort_type: fullPreference.sortOrder.sort_type,
          formula: fullPreference.sortOrder.formula,
          created_at: fullPreference.sortOrder.created_at.toISOString(),
          updated_at: fullPreference.sortOrder.updated_at.toISOString(),
          deleted_at:
            fullPreference.sortOrder.deleted_at?.toISOString() ?? null,
        },
        created_at: fullPreference.created_at.toISOString(),
        updated_at: fullPreference.updated_at.toISOString(),
        user: {
          id: fullPreference.user.id,
          email: fullPreference.user.email,
          created_at: fullPreference.user.created_at.toISOString(),
        },
        feed: {
          id: fullPreference.feed.id,
          type: fullPreference.feed.type,
          visibility_rules: fullPreference.feed.visibility_rules,
          created_at: fullPreference.feed.created_at.toISOString(),
          updated_at: fullPreference.feed.updated_at.toISOString(),
          sortingOption: {
            id: fullPreference.feed.sortingOption.id,
            sort_type: fullPreference.feed.sortingOption.sort_type,
            formula: fullPreference.feed.sortingOption.formula,
            created_at:
              fullPreference.feed.sortingOption.created_at.toISOString(),
            updated_at:
              fullPreference.feed.sortingOption.updated_at.toISOString(),
            deleted_at:
              fullPreference.feed.sortingOption.deleted_at?.toISOString() ??
              null,
          },
        },
      },
    ],
    pagination: {
      current: props.body.page ?? 1,
      limit: props.body.limit ?? 100,
      records: 1,
      pages: 1,
    },
  };
}
