import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemNotification";
import { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemNotificationTransformer } from "../transformers/RedditCommunitySystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunitySystemNotifications(props: {
  body: IRedditCommunitySystemNotification.IRequest;
}): Promise<IPageIRedditCommunitySystemNotification> {
  const page = props.body.page ?? 1;
  if (page < 1) throw new HttpException("Page must be >= 1", 400);
  const limit = props.body.limit ?? 100;
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.reddit_community_system_notifications.findMany({
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...RedditCommunitySystemNotificationTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_community_system_notifications.count();
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySystemNotificationTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
