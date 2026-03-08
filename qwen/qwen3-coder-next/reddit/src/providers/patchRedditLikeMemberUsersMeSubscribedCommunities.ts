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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberUsersMeSubscribedCommunities(props: {
  member: MemberPayload;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_like_subscriptions.findMany({
    where: {
      reddit_like_member_id: props.member.id,
      status: "subscribed",
      deleted_at: null,
    },
    include: {
      community: true,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.reddit_like_subscriptions.count({
    where: {
      reddit_like_member_id: props.member.id,
      status: "subscribed",
      deleted_at: null,
    },
  });
  return {
    data: data.map(
      (sub) =>
        ({
          id: sub.community.id,
          name: sub.community.name,
          icon_url: sub.community.icon_url,
          created_at: sub.community.created_at.toISOString() as string &
            tags.Format<"date-time">,
        }) satisfies IRedditLikeCommunity.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
