import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditLikeUsersUserIdSubscriptions(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.ISubscriptionsRequest;
}): Promise<IPageIRedditLikeCommunity.ISubscriptionSummary> {
  const { member, userId, body } = props;

  // Authorization: Check if user can view this subscription list
  if (userId !== member.id) {
    const targetUser =
      await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
        where: { id: userId },
      });

    if (!targetUser.show_subscriptions_publicly) {
      throw new HttpException("This user's subscription list is private", 403);
    }
  }

  // Pagination setup with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Query subscriptions with community data
  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        member_id: userId,
        community: {
          deleted_at: null,
        },
      },
      include: {
        community: {
          select: {
            id: true,
            code: true,
            name: true,
            icon_url: true,
            subscriber_count: true,
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
        member_id: userId,
        community: {
          deleted_at: null,
        },
      },
    }),
  ]);

  // Map to response format
  const data: IRedditLikeCommunity.ISubscriptionSummary[] = subscriptions.map(
    (sub) => ({
      id: sub.community.id as string & tags.Format<"uuid">,
      code: sub.community.code,
      name: sub.community.name,
      icon_url: sub.community.icon_url ?? undefined,
      subscriber_count: sub.community.subscriber_count,
      subscribed_at: toISOStringSafe(sub.subscribed_at),
    }),
  );

  // Build pagination metadata
  const pages = total > 0 ? Math.ceil(total / limit) : 0;

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
