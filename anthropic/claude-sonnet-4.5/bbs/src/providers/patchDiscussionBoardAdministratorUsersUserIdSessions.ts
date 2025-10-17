import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorUsersUserIdSessions(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSession.IRequest;
}): Promise<IPageIDiscussionBoardSession> {
  const { administrator, userId, body } = props;

  // Verify the target user exists (check all three user types)
  const [member, moderator, admin] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findFirst({
      where: { id: userId },
    }),
    MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { id: userId },
    }),
    MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { id: userId },
    }),
  ]);

  if (!member && !moderator && !admin) {
    throw new HttpException("User not found", 404);
  }

  // Build WHERE clause with all filters
  const where = {
    OR: [
      { discussion_board_member_id: userId },
      { discussion_board_moderator_id: userId },
      { discussion_board_administrator_id: userId },
    ],
    ...(body.device_type !== undefined &&
      body.device_type !== null && {
        device_type: { contains: body.device_type },
      }),
    ...(body.browser_info !== undefined &&
      body.browser_info !== null && {
        browser_info: { contains: body.browser_info },
      }),
    ...(body.location !== undefined &&
      body.location !== null && {
        location: { contains: body.location },
      }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: { contains: body.ip_address },
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
    ...(body.last_activity_after !== undefined &&
      body.last_activity_after !== null && {
        last_activity_at: {
          gte: body.last_activity_after,
        },
      }),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "last_activity_at";
  const sortOrder = body.sort_order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sessions.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_sessions.count({ where }),
  ]);

  const data: IDiscussionBoardSession[] = sessions.map((session) => ({
    id: session.id,
    discussion_board_member_id: session.discussion_board_member_id ?? undefined,
    discussion_board_moderator_id:
      session.discussion_board_moderator_id ?? undefined,
    discussion_board_administrator_id:
      session.discussion_board_administrator_id ?? undefined,
    device_type: session.device_type,
    browser_info: session.browser_info,
    ip_address: session.ip_address,
    location: session.location ?? undefined,
    is_active: session.is_active,
    expires_at: toISOStringSafe(session.expires_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
    created_at: toISOStringSafe(session.created_at),
    revoked_at: session.revoked_at
      ? toISOStringSafe(session.revoked_at)
      : undefined,
  }));

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
