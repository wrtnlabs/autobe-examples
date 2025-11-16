import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IRequest;
}): Promise<IPageITodoListAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      todo_list_admin_id: props.adminId,
    };

    if (props.body.created_at_after || props.body.created_at_before) {
      conditions.created_at = {};
      if (props.body.created_at_after) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          props.body.created_at_after,
        );
      }
      if (props.body.created_at_before) {
        (conditions.created_at as Record<string, unknown>).lte = new Date(
          props.body.created_at_before,
        );
      }
    }

    if (props.body.expired_at_after || props.body.expired_at_before) {
      conditions.expired_at = {};
      if (props.body.expired_at_after) {
        (conditions.expired_at as Record<string, unknown>).gte = new Date(
          props.body.expired_at_after,
        );
      }
      if (props.body.expired_at_before) {
        (conditions.expired_at as Record<string, unknown>).lte = new Date(
          props.body.expired_at_before,
        );
      }
    }

    if (props.body.ip) {
      conditions.ip = props.body.ip;
    }

    if (props.body.search) {
      conditions.OR = [
        { ip: { contains: props.body.search } },
        { href: { contains: props.body.search } },
        { referrer: { contains: props.body.search } },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const buildOrderBy = () => {
    if (!props.body.sort || props.body.sort.length === 0) {
      return undefined;
    }

    return props.body.sort.map((field) => {
      const isDescending = field.startsWith("-");
      const fieldName = isDescending ? field.substring(1) : field;
      return { [fieldName]: isDescending ? "desc" : "asc" };
    });
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: buildOrderBy(),
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((session) => ({
      id: session.id,
      todo_list_admin_id: session.todo_list_admin_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    })),
  };
}
