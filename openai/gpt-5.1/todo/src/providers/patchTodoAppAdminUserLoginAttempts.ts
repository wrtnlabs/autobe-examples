import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLoginAttempt";
import { IPageITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppLoginAttempt";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserLoginAttempts(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppLoginAttempt.IRequest;
}): Promise<IPageITodoAppLoginAttempt.ISummary> {
  const page: number = props.body.page !== undefined ? props.body.page : 1;
  const limit: number = props.body.limit !== undefined ? props.body.limit : 100;

  const skip: number = (page - 1) * limit;

  const hasCreatedFrom: boolean =
    props.body.created_from !== undefined && props.body.created_from !== null;
  const hasCreatedTo: boolean =
    props.body.created_to !== undefined && props.body.created_to !== null;

  const where = {
    ...(props.body.login_identifier !== undefined && {
      login_identifier: props.body.login_identifier,
    }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.succeeded !== undefined && {
      succeeded: props.body.succeeded,
    }),
    ...(props.body.ip !== undefined && {
      ip: props.body.ip,
    }),
    ...(props.body.failure_reason !== undefined && {
      failure_reason: props.body.failure_reason,
    }),
    ...(() => {
      if (!hasCreatedFrom && !hasCreatedTo) return {};

      return {
        created_at: {
          ...(hasCreatedFrom && props.body.created_from !== null
            ? { gte: props.body.created_from }
            : {}),
          ...(hasCreatedTo && props.body.created_to !== null
            ? { lte: props.body.created_to }
            : {}),
        },
      };
    })(),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_login_attempts.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        memberUser: {
          select: {
            id: true,
            email: true,
            display_name: true,
            status: true,
            last_login_at: true,
          },
        },
        adminUser: {
          select: {
            id: true,
            email: true,
            display_name: true,
            status: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_login_attempts.count({ where }),
  ]);

  const data: ITodoAppLoginAttempt.ISummary[] = rows.map((row) => {
    const memberSummary: ITodoAppMemberuser.ISummary | undefined =
      row.memberUser === null
        ? undefined
        : {
            id: row.memberUser.id,
            email: row.memberUser.email,
            display_name: row.memberUser.display_name ?? null,
            status: row.memberUser.status,
            last_login_at:
              row.memberUser.last_login_at !== null
                ? toISOStringSafe(row.memberUser.last_login_at)
                : null,
          };

    const adminSummary: ITodoAppAdminUser.ISummary | undefined =
      row.adminUser === null
        ? undefined
        : {
            id: row.adminUser.id,
            email: row.adminUser.email,
            display_name: row.adminUser.display_name ?? null,
            status: row.adminUser.status,
            last_login_at:
              row.adminUser.last_login_at !== null
                ? toISOStringSafe(row.adminUser.last_login_at)
                : null,
            created_at: toISOStringSafe(row.adminUser.created_at),
            updated_at: toISOStringSafe(row.adminUser.updated_at),
          };

    return {
      id: row.id,
      login_identifier: row.login_identifier,
      actor_type: row.actor_type,
      succeeded: row.succeeded,
      ip: row.ip,
      failure_reason: row.failure_reason ?? null,
      created_at: toISOStringSafe(row.created_at),
      ...(memberSummary !== undefined && { memberUser: memberSummary }),
      ...(adminSummary !== undefined && { adminUser: adminSummary }),
    };
  });

  const pages: number = limit === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
