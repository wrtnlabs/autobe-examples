import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession> {
  const { adminId, body } = props;

  // Check admin existence and not soft deleted
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: adminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin account not found or deactivated", 404);
  }

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const take = limit > 100 ? 100 : limit;
  const skip = (page - 1) * take;

  // Filtering
  const where = {
    admin_id: adminId,
    ...(body.ip !== undefined && { ip: body.ip }),
    ...(body.href !== undefined && { href: body.href }),
    ...(body.referrer !== undefined && { referrer: body.referrer }),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.expired_at_from || body.expired_at_to
      ? {
          expired_at: {
            ...(body.expired_at_from && { gte: body.expired_at_from }),
            ...(body.expired_at_to && { lte: body.expired_at_to }),
          },
        }
      : {}),
  };

  // Query
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_admin_sessions.count({ where }),
  ]);

  // Admin summary for embedding
  const adminSummary = {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : undefined,
  };

  const data = sessions.map((session) => ({
    id: session.id,
    admin: adminSummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
  };
}
