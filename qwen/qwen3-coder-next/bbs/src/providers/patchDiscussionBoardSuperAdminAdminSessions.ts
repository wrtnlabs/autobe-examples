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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminSessions(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where conditions - use direct string comparison for datetime fields
  const whereInput: Prisma.discussion_board_admin_sessionsWhereInput = {
    ...(props.body.adminId && {
      admin: {
        id: props.body.adminId,
      },
    }),
    ...(props.body.ip && {
      ip: props.body.ip,
    }),
    ...(props.body.createdFrom && {
      created_at: {
        gte: props.body.createdFrom,
      },
    }),
    ...(props.body.createdTo && {
      created_at: {
        lte: props.body.createdTo,
      },
    }),
    ...(props.body.expiredFrom && {
      expired_at: {
        gte: props.body.expiredFrom,
      },
    }),
    ...(props.body.expiredTo && {
      expired_at: {
        lte: props.body.expiredTo,
      },
    }),
    ...(props.body.isActive !== undefined && {
      expired_at: props.body.isActive
        ? { gt: toISOStringSafe(new Date()) }
        : { lte: toISOStringSafe(new Date()) },
    }),
  };
  // Build orderBy conditions - use conditional object
  const orderByInput =
    ((): Prisma.discussion_board_admin_sessionsOrderByWithRelationInput => {
      if (props.body.sortBy === "id") {
        return props.body.sortOrder === "asc"
          ? { id: "asc", created_at: "asc" }
          : { id: "desc", created_at: "desc" };
      } else if (props.body.sortBy === "created_at") {
        return props.body.sortOrder === "asc"
          ? { created_at: "asc", id: "asc" }
          : { created_at: "desc", id: "desc" };
      } else if (props.body.sortBy === "expired_at") {
        return props.body.sortOrder === "asc"
          ? { expired_at: "asc", created_at: "asc" }
          : { expired_at: "desc", created_at: "desc" };
      } else if (props.body.sortBy === "ip") {
        return props.body.sortOrder === "asc"
          ? { ip: "asc", created_at: "asc" }
          : { ip: "desc", created_at: "desc" };
      } else {
        return props.body.sortOrder === "asc"
          ? { created_at: "asc", id: "asc" }
          : { created_at: "desc", id: "desc" };
      }
    })();
  // Execute query
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        ip: true,
        href: true,
        created_at: true,
        expired_at: true,
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
    }),
    MyGlobal.prisma.discussion_board_admin_sessions.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const data = sessions.map(
    (session) =>
      ({
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
          deleted_at: session.admin.deleted_at
            ? toISOStringSafe(session.admin.deleted_at)
            : null,
        },
      }) satisfies IDiscussionBoardAdminSession.ISummary,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data,
  } satisfies IPageIDiscussionBoardAdminSession.ISummary;
}
