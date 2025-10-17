import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function getRedditLikeCommunitiesCommunityIdSubscriptions(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeMember.ISummary> {
  const { communityId } = props;

  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: {
      id: communityId,
    },
  });

  const page = 0;
  const limit = 20;
  const skip = page * limit;

  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        community_id: communityId,
      },
      include: {
        member: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        subscribed_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_community_subscriptions.count({
      where: {
        community_id: communityId,
      },
    }),
  ]);

  const data: IRedditLikeMember.ISummary[] = subscriptions.map((sub) => ({
    id: sub.member.id,
    username: sub.member.username,
    avatar_url:
      sub.member.avatar_url === null ? undefined : sub.member.avatar_url,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
