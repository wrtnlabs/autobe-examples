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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserCommunitiesCommunityNameSubscriptions(props: {
  user: UserPayload;
  communityName: string;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const { user, communityName, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  const where = {
    reddit_community_community_id: community.id,
  } as const;

  const validSortFields = ["created_at", "updated_at"];
  const sortField = validSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";

  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_subscriptions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      reddit_community_user_id: item.reddit_community_user_id,
      reddit_community_community_id: item.reddit_community_community_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
