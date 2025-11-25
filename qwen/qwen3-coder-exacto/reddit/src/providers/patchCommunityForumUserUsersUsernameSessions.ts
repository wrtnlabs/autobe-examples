import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserSession";
import { IPageICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityForumUserUsersUsernameSessions(props: {
  user: UserPayload;
  username: string;
  body: ICommunityForumCommunityUserSession.IRequest;
}): Promise<IPageICommunityForumCommunityUserSession.ISummary> {
  // First, find the user by username
  const targetUser = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      username: props.username,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Authorization check - users can only access their own sessions
  if (props.user.id !== targetUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Setup pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: {
    community_forum_user_id: string;
    ip?: { contains: string };
    href?: { contains: string };
    referrer?: { contains: string };
    created_at?:
      | { gte: string & tags.Format<"date-time"> }
      | { lte: string & tags.Format<"date-time"> }
      | {
          gte: string & tags.Format<"date-time">;
          lte: string & tags.Format<"date-time">;
        };
    expired_at?: null;
  } = {
    community_forum_user_id: targetUser.id,
  };

  // Apply filters
  if (props.body.ip) {
    whereConditions.ip = {
      contains: props.body.ip,
    };
  }

  if (props.body.href) {
    whereConditions.href = {
      contains: props.body.href,
    };
  }

  if (props.body.referrer) {
    whereConditions.referrer = {
      contains: props.body.referrer,
    };
  }

  if (props.body.created_after) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      gte: props.body.created_after,
    };
  }

  if (props.body.created_before) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      lte: props.body.created_before,
    };
  }

  if (props.body.active_only) {
    whereConditions.expired_at = null;
  }

  // Determine sort order
  let orderBy: { ip: "asc" | "desc" } | { created_at: "asc" | "desc" } = {
    created_at: "desc",
  };

  if (props.body.sort) {
    switch (props.body.sort) {
      case "ip":
        orderBy = { ip: props.body.order || "asc" };
        break;
      case "created_at":
        orderBy = { created_at: props.body.order || "desc" };
        break;
      // Default to created_at desc if sort field is not recognized
      default:
        orderBy = { created_at: "desc" };
    }
  }

  // Execute query with pagination
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.community_forum_user_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  // Transform to response format
  const sessionSummaries: ICommunityForumCommunityUserSession.ISummary[] =
    sessions.map((session) => ({
      id: session.id,
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessionSummaries,
  };
}
