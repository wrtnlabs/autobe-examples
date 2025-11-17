import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModeratorSession";
import { IPageICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityForumAdministratorModeratorsModeratorIdSessions(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModeratorSession.IRequest;
}): Promise<IPageICommunityForumCommunityModeratorSession.ISummary> {
  // Verify moderator exists
  const moderator = await MyGlobal.prisma.community_forum_moderators.findUnique(
    {
      where: { id: props.moderatorId },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Build where conditions
  const where: Prisma.community_forum_moderator_sessionsWhereInput = {
    community_forum_moderator_id: props.moderatorId,
  };

  // Apply status filter
  if (props.body.status === "active") {
    where.expired_at = null;
  } else if (props.body.status === "expired") {
    where.expired_at = { not: null };
  }

  // Apply creation time filters
  if (props.body.created_after || props.body.created_before) {
    where.created_at = {};
    if (props.body.created_after) {
      where.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      where.created_at.lte = props.body.created_before;
    }
  }

  // Apply expiration time filters
  if (props.body.expired_after || props.body.expired_before) {
    // Initialize expired_at filter if not already set
    if (!where.expired_at) {
      where.expired_at = {};
    }

    // Apply filters only if expired_at is an object (not null)
    if (
      where.expired_at &&
      typeof where.expired_at === "object" &&
      !Array.isArray(where.expired_at)
    ) {
      if (props.body.expired_after) {
        (where.expired_at as Prisma.DateTimeNullableFilter).gte =
          props.body.expired_after;
      }
      if (props.body.expired_before) {
        (where.expired_at as Prisma.DateTimeNullableFilter).lte =
          props.body.expired_before;
      }
    }
  }

  // Handle pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Determine sort order
  const orderBy =
    props.body.sort === "created_at:asc"
      ? { created_at: Prisma.SortOrder.asc }
      : { created_at: Prisma.SortOrder.desc };

  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderator_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_moderator_sessions.count({ where }),
  ]);

  // Transform to API format
  return {
    data: data.map((session) => ({
      id: session.id,
      community_forum_moderator_id: session.community_forum_moderator_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
