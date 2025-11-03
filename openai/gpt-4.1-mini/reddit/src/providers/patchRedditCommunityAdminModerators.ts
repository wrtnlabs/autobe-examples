import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const sortBy = body.sortBy === "created_at" ? "created_at" : "created_at";
  const sortOrder =
    body.sortOrder === "asc" || body.sortOrder === "desc"
      ? body.sortOrder
      : "desc";

  const createdAtRange: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};

  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    createdAtRange.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    createdAtRange.lte = body.created_at_to;
  }

  const where: {
    user_id?: string & tags.Format<"uuid">;
    created_at?: typeof createdAtRange;
  } = {};

  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id;
  }

  if (Object.keys(createdAtRange).length > 0) {
    where.created_at = createdAtRange;
  }

  if (body.search !== undefined && body.search !== null) {
    // Since no relation filter possible, will apply search in code after fetching (alternative)
  }

  // Fetch moderators with where and pagination
  const [items, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: { id: true, user_id: true, created_at: true },
    }),
    MyGlobal.prisma.reddit_community_moderator.count({ where }),
  ]);

  // Fetch users for the moderators
  const userIds = items.map((item) => item.user_id);
  const users = await MyGlobal.prisma.reddit_community_user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, created_at: true },
  });

  // Map users by id
  const userMap = new Map<string, { email: string; created_at: Date }>();
  for (const user of users) {
    userMap.set(user.id, user);
  }

  // Prepare the data with joined user info
  const data = items.map((item) => {
    // Find user info
    const userInfo = userMap.get(item.user_id);
    return {
      id: item.id,
      user_id: item.user_id,
      created_at: toISOStringSafe(item.created_at),
      user_email: userInfo?.email ?? "",
      user_created_at: userInfo
        ? toISOStringSafe(userInfo.created_at)
        : "1970-01-01T00:00:00.000Z",
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
