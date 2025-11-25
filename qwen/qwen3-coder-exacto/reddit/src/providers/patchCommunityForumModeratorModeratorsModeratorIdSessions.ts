import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModeratorSession";
import { IPageICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityForumModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModeratorSession.IRequest;
}): Promise<IPageICommunityForumCommunityModeratorSession.ISummary> {
  // Verify the target moderator exists
  const targetModerator =
    await MyGlobal.prisma.community_forum_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Authorization check - only the moderator themselves can view their sessions
  // (In a real implementation, administrators would likely use a different endpoint
  // or this function would accept both ModeratorPayload and AdministratorPayload)
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException("Forbidden", 403);
  }

  // Calculate pagination values
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build the where condition based on filters
  const whereCondition: Prisma.community_forum_moderator_sessionsWhereInput = {
    community_forum_moderator_id: props.moderatorId,
  };

  // Apply status filter
  if (props.body.status === "active") {
    whereCondition.expired_at = null;
  } else if (props.body.status === "expired") {
    whereCondition.NOT = [{ expired_at: null }];
  }

  // Apply date filters
  if (props.body.created_after || props.body.created_before) {
    whereCondition.created_at = {};
    if (props.body.created_after) {
      whereCondition.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereCondition.created_at.lte = props.body.created_before;
    }
  }

  if (props.body.expired_after || props.body.expired_before) {
    whereCondition.expired_at = {};
    if (props.body.expired_after) {
      whereCondition.expired_at.gte = props.body.expired_after;
    }
    if (props.body.expired_before) {
      whereCondition.expired_at.lte = props.body.expired_before;
    }
  }

  // Determine sort order
  const orderBy: Prisma.community_forum_moderator_sessionsOrderByWithRelationInput =
    props.body.sort === "created_at:asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };

  // Execute the paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderator_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_moderator_sessions.count({
      where: whereCondition,
    }),
  ]);

  // Transform the data to match the response DTO
  const transformedData = data.map((session) => ({
    id: session.id,
    community_forum_moderator_id: session.community_forum_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    // Handle the optional/nullable expired_at field correctly according to the DTO
    // The DTO type is: expired_at?: (string & tags.Format<"date-time">) | null | undefined;
    expired_at:
      session.expired_at === null
        ? null
        : session.expired_at
          ? toISOStringSafe(session.expired_at)
          : undefined,
  }));

  // Return the paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
