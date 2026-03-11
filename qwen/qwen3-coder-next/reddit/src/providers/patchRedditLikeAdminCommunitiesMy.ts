import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminCommunitiesMy(props: {
  admin: AdminPayload;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.reddit_like_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.admin.id,
        status: "subscribed",
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.reddit_like_subscriptions.count({
    where: {
      reddit_like_member_id: props.admin.id,
      status: "subscribed",
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(subscriptions, async (sub) => {
      const community = sub.community;
      return {
        name: community.name,
        icon_url: community.icon_url ?? null,
        subscriber_count: 0,
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
