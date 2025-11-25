import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModeratorsUsernameSessions(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IDiscussionBoardModeratorSession.IRequest;
}): Promise<IPageIDiscussionBoardModeratorSession.ISummary> {
  // Verify the target moderator exists and is active
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Verify the requesting moderator has permission to access these sessions
  if (targetModerator.id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build complex where conditions
  const whereConditions: Record<string, unknown> = {
    discussion_board_moderator_id: targetModerator.id,
    deleted_at: null,
  };

  // Apply search filter
  if (props.body.search) {
    whereConditions.OR = [
      { ip: { contains: props.body.search, mode: "insensitive" } },
      { href: { contains: props.body.search, mode: "insensitive" } },
      { referrer: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply IP filter
  if (props.body.ip) {
    whereConditions.ip = props.body.ip;
  }

  // Apply date range filters
  if (props.body.created_at_start || props.body.created_at_end) {
    const createdAtCondition: Record<string, unknown> = {};
    if (props.body.created_at_start) {
      createdAtCondition.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      createdAtCondition.lte = props.body.created_at_end;
    }
    whereConditions.created_at = createdAtCondition;
  }

  // Apply expiration filter
  if (props.body.expired !== undefined) {
    if (props.body.expired) {
      whereConditions.expired_at = { not: null };
    } else {
      whereConditions.expired_at = null;
    }
  }

  // Build order by
  const orderBy: Record<string, "asc" | "desc"> = {};
  const sortField = props.body.sort_by || "created_at";
  const sortOrder = props.body.order || "desc";
  orderBy[sortField] = sortOrder;

  // Execute concurrent queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderator_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_moderator_sessions.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match API DTO
  const transformedData = data.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
