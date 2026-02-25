import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSessions(props: {
  body: IDiscussionBoardSuperAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.discussion_board_super_admin_sessionsWhereInput = {};
  // Active status filter
  if (props.body.active !== undefined && props.body.active !== null) {
    where.active = props.body.active;
  }
  // Created at range filter - convert string to Date for Prisma
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    where.created_at = {
      ...(where.created_at as Prisma.DateTimeFilter),
      gte: new Date(props.body.created_at_from),
    };
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    where.created_at = {
      ...(where.created_at as Prisma.DateTimeFilter),
      lte: new Date(props.body.created_at_to),
    };
  }
  // Expired at range filter - convert string to Date for Prisma
  if (
    props.body.expired_at_from !== undefined &&
    props.body.expired_at_from !== null
  ) {
    where.expired_at = {
      ...(where.expired_at as Prisma.DateTimeFilter),
      gte: new Date(props.body.expired_at_from),
    };
  }
  if (
    props.body.expired_at_to !== undefined &&
    props.body.expired_at_to !== null
  ) {
    where.expired_at = {
      ...(where.expired_at as Prisma.DateTimeFilter),
      lte: new Date(props.body.expired_at_to),
    };
  }
  // IP address filter (partial match)
  if (props.body.ip !== undefined && props.body.ip !== null) {
    where.ip = { contains: props.body.ip };
  }
  // User agent filter (partial match)
  if (props.body.user_agent !== undefined && props.body.user_agent !== null) {
    where.user_agent = { contains: props.body.user_agent };
  }
  // Referrer filter (partial match)
  if (props.body.referrer !== undefined && props.body.referrer !== null) {
    where.referrer = { contains: props.body.referrer };
  }
  // Execute query
  const data =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        super_admin_id: true,
        ip: true,
        active: true,
        created_at: true,
        expired_at: true,
        updated_at: true,
        superAdmin: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.count({
      where,
    });
  // Transform data to response format - convert dates to proper string format
  const transformed: IDiscussionBoardSuperAdminSession.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      super_admin_id: record.super_admin_id as string & tags.Format<"uuid">,
      ip: record.ip,
      active: record.active,
      created_at: toISOStringSafe(record.created_at),
      expired_at: toISOStringSafe(record.expired_at),
      updated_at: toISOStringSafe(record.updated_at),
      superAdmin: {
        id: record.superAdmin.id as string & tags.Format<"uuid">,
        email: record.superAdmin.email,
        created_at: toISOStringSafe(record.superAdmin.created_at),
      },
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformed,
  };
}
