import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModeratorSession.IRequest;
}): Promise<IPageIDiscussionBoardModeratorSession> {
  const { moderatorId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    discussion_board_moderator_id: moderatorId,
  };

  if (body.ip) {
    whereCondition.ip = body.ip;
  }

  if (body.created_after || body.created_before) {
    whereCondition.created_at = {};
    if (body.created_after) {
      (whereCondition.created_at as Record<string, unknown>).gte = new Date(
        body.created_after,
      );
    }
    if (body.created_before) {
      (whereCondition.created_at as Record<string, unknown>).lte = new Date(
        body.created_before,
      );
    }
  }

  if (body.is_active !== undefined) {
    whereCondition.expired_at = body.is_active ? null : { not: null };
  }

  let orderBy: Record<string, string> = { created_at: "desc" };
  if (body.sort) {
    const sortField =
      body.sort.startsWith("+") || body.sort.startsWith("-")
        ? body.sort.substring(1)
        : body.sort;
    const sortDirection = body.sort.startsWith("+") ? "asc" : "desc";
    orderBy = { [sortField]: sortDirection };
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderator_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        moderator: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderator_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      discussion_board_moderator_id:
        session.discussion_board_moderator_id as string & tags.Format<"uuid">,
      moderator: {
        id: session.moderator.id as string & tags.Format<"uuid">,
        email: session.moderator.email as string & tags.Format<"email">,
        username: session.moderator.username,
        display_name: session.moderator.display_name ?? undefined,
        email_verified: session.moderator.email_verified,
        email_verified_at: session.moderator.email_verified_at
          ? toISOStringSafe(session.moderator.email_verified_at)
          : undefined,
        is_active: session.moderator.is_active,
        last_login_at: session.moderator.last_login_at
          ? toISOStringSafe(session.moderator.last_login_at)
          : undefined,
        created_at: toISOStringSafe(session.moderator.created_at),
        updated_at: toISOStringSafe(session.moderator.updated_at),
        deleted_at: session.moderator.deleted_at
          ? toISOStringSafe(session.moderator.deleted_at)
          : undefined,
      },
      ip: session.ip,
      href: session.href as string & tags.Format<"uri">,
      referrer: session.referrer as string & tags.Format<"uri">,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
