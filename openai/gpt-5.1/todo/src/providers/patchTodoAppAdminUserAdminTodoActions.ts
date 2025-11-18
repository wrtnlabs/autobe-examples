import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import { IPageITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminTodoAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserAdminTodoActions(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppAdminTodoAction.IRequest;
}): Promise<IPageITodoAppAdminTodoAction.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;

  const defaultPageSize = 50;
  const maxPageSize = 200;
  const requestedPageSize =
    props.body.pageSize !== undefined && props.body.pageSize >= 1
      ? props.body.pageSize
      : defaultPageSize;
  const limit =
    requestedPageSize > maxPageSize ? maxPageSize : requestedPageSize;

  const skip = (page - 1) * limit;

  const where: Prisma.todo_app_admin_todo_actionsWhereInput = {
    ...(props.body.adminUserId !== undefined
      ? { todo_app_adminuser_id: props.body.adminUserId }
      : {}),
    ...(props.body.memberUserId !== undefined
      ? { todo_app_memberuser_id: props.body.memberUserId }
      : {}),
    ...(props.body.todoId !== undefined
      ? { todo_app_todo_id: props.body.todoId }
      : {}),
    ...(props.body.actionType !== undefined
      ? { action_type: props.body.actionType }
      : {}),
    ...(props.body.reasonCategory !== undefined
      ? { reason_category: props.body.reasonCategory }
      : {}),
    ...(() => {
      if (
        props.body.occurredFrom === undefined &&
        props.body.occurredTo === undefined
      )
        return {};
      const createdAtRange: Prisma.DateTimeFilter = {};
      if (props.body.occurredFrom !== undefined) {
        createdAtRange.gte = props.body.occurredFrom;
      }
      if (props.body.occurredTo !== undefined) {
        createdAtRange.lte = props.body.occurredTo;
      }
      return { created_at: createdAtRange };
    })(),
  };

  const sortField = (() => {
    const requested = props.body.sortBy;
    if (
      requested === "action_type" ||
      requested === "reason_category" ||
      requested === "created_at"
    ) {
      return requested;
    }
    return "created_at";
  })();

  const sortDirection: Prisma.SortOrder = (() => {
    const direction = props.body.sortDirection;
    if (direction === undefined) return "desc";
    const lowered = direction.toLowerCase();
    if (lowered === "asc" || lowered === "desc") return lowered;
    return "desc";
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admin_todo_actions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDirection,
      },
      include: {
        adminUser: true,
        memberUser: true,
        todo: {
          include: {
            memberUser: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_admin_todo_actions.count({
      where,
    }),
  ]);

  const data: ITodoAppAdminTodoAction.ISummary[] = rows.map((row) => {
    const admin = row.adminUser;
    const member = row.memberUser;
    const todo = row.todo;
    const todoOwner = todo.memberUser;

    const adminSummary: ITodoAppAdminUser.ISummary = {
      id: admin.id,
      email: admin.email,
      display_name:
        admin.display_name === null ? undefined : admin.display_name,
      status: admin.status,
      last_login_at:
        admin.last_login_at === null
          ? null
          : toISOStringSafe(admin.last_login_at),
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    };

    const memberSummary: ITodoAppMemberuser.ISummary = {
      id: member.id,
      email: member.email,
      display_name:
        member.display_name === null ? undefined : member.display_name,
      status: member.status,
      last_login_at:
        member.last_login_at === null
          ? null
          : toISOStringSafe(member.last_login_at),
    };

    const todoOwnerSummary: ITodoAppMemberuser.ISummary = {
      id: todoOwner.id,
      email: todoOwner.email,
      display_name:
        todoOwner.display_name === null ? undefined : todoOwner.display_name,
      status: todoOwner.status,
      last_login_at:
        todoOwner.last_login_at === null
          ? null
          : toISOStringSafe(todoOwner.last_login_at),
    };

    const todoSummary: ITodoAppTodo.ISummary = {
      id: todo.id,
      title: todo.title,
      status: todo.status,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      completed_at:
        todo.completed_at === null ? null : toISOStringSafe(todo.completed_at),
      memberUser: todoOwnerSummary,
    };

    return {
      id: row.id,
      adminUser: adminSummary,
      memberUser: memberSummary,
      todo: todoSummary,
      action_type: row.action_type,
      reason_category: row.reason_category,
      reason_detail: row.reason_detail === null ? undefined : row.reason_detail,
      ip: row.ip === null ? undefined : row.ip,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
