import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditFeedPreferenceTransformer } from "../transformers/RedditFeedPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberPreferences(props: {
  member: MemberPayload;
  body: IRedditFeedPreference.IUpdate;
}): Promise<IRedditFeedPreference> {
  const { member, body } = props;
  await MyGlobal.prisma.reddit_feed_preferences.update({
    where: { user_id: member.id },
    data: {
      feed_id: body.feed_id,
      sort_order_id: body.sort_order_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const preference =
    await MyGlobal.prisma.reddit_feed_preferences.findUniqueOrThrow({
      where: { user_id: member.id },
      ...RedditFeedPreferenceTransformer.select(),
    });
  return await RedditFeedPreferenceTransformer.transform(preference);
}
