import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunitySubscriptions(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_subscriptionsWhereInput = {
    deleted_at: null,
    reddit_community_registered_user_id: props.registeredUser.id as string &
      tags.Format<"uuid">,
    ...(props.body.community_id !== undefined
      ? {
          reddit_community_community_id: props.body.community_id as string &
            tags.Format<"uuid">,
        }
      : {}),
    ...(props.body.is_active === true
      ? { is_active: true }
      : props.body.is_active === false
        ? { is_active: false }
        : {}),
    ...(typeof props.body.search === "string" && props.body.search !== ""
      ? {
          OR: [
            { id: { equals: props.body.search } },
            { reddit_community_community_id: { equals: props.body.search } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        reddit_community_community_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_subscriptions.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      community_id: record.reddit_community_community_id,
      subscribed_at: toISOStringSafe(record.created_at),
    })),
  };
}
