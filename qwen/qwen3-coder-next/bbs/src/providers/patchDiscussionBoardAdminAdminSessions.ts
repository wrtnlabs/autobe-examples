import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminSessions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_admin_sessionsWhereInput = {};
  if (props.body.adminId) {
    where.discussion_board_admin_id = props.body.adminId;
  }
  if (props.body.ip) {
    where.ip = { contains: props.body.ip };
  }
  if (props.body.createdFrom || props.body.createdTo) {
    where.created_at = {};
    if (props.body.createdFrom) {
      where.created_at.gte = props.body.createdFrom;
    }
    if (props.body.createdTo) {
      where.created_at.lt = props.body.createdTo;
    }
  }
  if (props.body.expiredFrom || props.body.expiredTo) {
    where.expired_at = {};
    if (props.body.expiredFrom) {
      where.expired_at.gte = props.body.expiredFrom;
    }
    if (props.body.expiredTo) {
      where.expired_at.lt = props.body.expiredTo;
    }
  }
  if (props.body.isActive !== undefined) {
    const now = new Date().toISOString();
    if (props.body.isActive) {
      where.expired_at = { gt: now };
    } else {
      where.expired_at = { lte: now };
    }
  }
  const orderByField = props.body.sortBy ?? "created_at";
  const orderByDirection = props.body.sortOrder === "asc" ? "asc" : "desc";
  const data = await MyGlobal.prisma.discussion_board_admin_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [orderByField]: orderByDirection },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      created_at: true,
      expired_at: true,
      updated_at: true,
      ip: true,
      href: true,
      referrer: true,
      user_agent: true,
      admin: {
        select: {
          id: true,
          display_name: true,
          email: true,
          is_super_admin: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_admin_sessions.count({
    where,
  });
  return {
    data: data.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
      admin: {
        id: session.admin.id,
        display_name: session.admin.display_name,
        email: session.admin.email,
        is_super_admin: session.admin.is_super_admin,
        is_active: session.admin.is_active,
        created_at: toISOStringSafe(session.admin.created_at),
        updated_at: toISOStringSafe(session.admin.updated_at),
        deleted_at:
          session.admin.deleted_at === null
            ? null
            : toISOStringSafe(session.admin.deleted_at),
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
