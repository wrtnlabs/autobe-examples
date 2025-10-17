import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPortalMemberUsersUserIdSubscriptions(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPortalSubscription.ISummary> {
  const { member, userId } = props;

  // Authorization: only allow owners to list their subscriptions
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: cannot access another user's subscriptions",
      403,
    );
  }

  // Ensure the target user exists
  const targetUser = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) throw new HttpException("Not Found", 404);

  // Default pagination values
  const current = 1;
  const limit = 20;
  const skip = (current - 1) * limit;

  // Fetch active subscriptions only
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_subscriptions.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        community_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_portal_subscriptions.count({
      where: {
        user_id: userId,
        deleted_at: null,
      },
    }),
  ]);

  if (total === 0) throw new HttpException("Not Found", 404);

  const data = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id ?? undefined,
    community_id: r.community_id,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
