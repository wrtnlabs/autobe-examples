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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityForumAdministratorUsersUsernameSessions(props: {
  administrator: AdministratorPayload;
  username: string;
  body: ICommunityForumCommunityUserSession.IRequest;
}): Promise<IPageICommunityForumCommunityUserSession.ISummary> {
  // Find the user by username
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { username: props.username },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Build where conditions for sessions
  const whereConditions: Prisma.community_forum_user_sessionsWhereInput = {
    community_forum_user_id: user.id,
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

  // Handle date filtering with proper Prisma DateTimeFilter construction
  if (props.body.created_after && props.body.created_before) {
    // Both conditions specified
    whereConditions.created_at = {
      gte: props.body.created_after,
      lte: props.body.created_before,
    };
  } else if (props.body.created_after) {
    // Only created_after specified
    whereConditions.created_at = {
      gte: props.body.created_after,
    };
  } else if (props.body.created_before) {
    // Only created_before specified
    whereConditions.created_at = {
      lte: props.body.created_before,
    };
  }

  if (props.body.active_only) {
    whereConditions.expired_at = null;
  }

  // Set up pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Set up sorting
  let orderBy: Prisma.community_forum_user_sessionsOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (props.body.sort) {
    const order: Prisma.SortOrder = props.body.order === "asc" ? "asc" : "desc";

    switch (props.body.sort) {
      case "ip":
        orderBy = { ip: order };
        break;
      case "created_at":
        orderBy = { created_at: order };
        break;
      default:
        orderBy = { created_at: "desc" };
    }
  }

  // Execute queries
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

  // Transform to API response format
  const sessionSummaries = sessions.map((session) => ({
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
