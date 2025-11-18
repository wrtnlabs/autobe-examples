import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserAdminTodoActionsAdminTodoActionId(props: {
  adminUser: AdminuserPayload;
  adminTodoActionId: string;
}): Promise<ITodoAppAdminTodoAction> {
  // Ensure only authenticated admins can access; adminUser is already validated
  // by the AdminuserAuth decorator and adminuserAuthorize provider.
  // Here we only trust the payload and proceed.

  // Fetch the admin todo action with related entities for summary construction
  const action = await MyGlobal.prisma.todo_app_admin_todo_actions.findFirst({
    where: {
      id: props.adminTodoActionId,
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
  });

  if (action === null) {
    throw new HttpException("Admin todo action not found", 404);
  }

  // Validate that critical relations exist; if not, treat as server-side data issue
  if (!action.adminUser) {
    throw new HttpException(
      "Related admin user not found for this admin todo action",
      500,
    );
  }

  if (!action.memberUser) {
    throw new HttpException(
      "Related member user not found for this admin todo action",
      500,
    );
  }

  if (!action.todo) {
    throw new HttpException(
      "Related todo not found for this admin todo action",
      500,
    );
  }

  if (!action.todo.memberUser) {
    throw new HttpException(
      "Related todo owner not found for this admin todo action",
      500,
    );
  }

  // Map admin user summary
  const adminUserSummary: ITodoAppAdminUser.ISummary = {
    id: action.adminUser.id,
    email: action.adminUser.email,
    display_name: action.adminUser.display_name,
    status: action.adminUser.status,
    last_login_at:
      action.adminUser.last_login_at !== null
        ? toISOStringSafe(action.adminUser.last_login_at)
        : null,
    created_at: toISOStringSafe(action.adminUser.created_at),
    updated_at: toISOStringSafe(action.adminUser.updated_at),
  };

  // Map member user summary for the audit subject
  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: action.memberUser.id,
    email: action.memberUser.email,
    display_name: action.memberUser.display_name,
    status: action.memberUser.status,
    last_login_at:
      action.memberUser.last_login_at !== null
        ? toISOStringSafe(action.memberUser.last_login_at)
        : null,
  };

  // Map member user summary for the todo owner (may be the same as memberUserSummary
  // but we rely on the relation from todo for correctness)
  const todoOwnerSummary: ITodoAppMemberuser.ISummary = {
    id: action.todo.memberUser.id,
    email: action.todo.memberUser.email,
    display_name: action.todo.memberUser.display_name,
    status: action.todo.memberUser.status,
    last_login_at:
      action.todo.memberUser.last_login_at !== null
        ? toISOStringSafe(action.todo.memberUser.last_login_at)
        : null,
  };

  // Map todo summary
  const todoSummary: ITodoAppTodo.ISummary = {
    id: action.todo.id,
    title: action.todo.title,
    status: action.todo.status,
    created_at: toISOStringSafe(action.todo.created_at),
    updated_at: toISOStringSafe(action.todo.updated_at),
    completed_at:
      action.todo.completed_at !== null
        ? toISOStringSafe(action.todo.completed_at)
        : null,
    memberUser: todoOwnerSummary,
  };

  // Build and return the final audit DTO
  const result: ITodoAppAdminTodoAction = {
    id: action.id,
    adminUser: adminUserSummary,
    memberUser: memberUserSummary,
    todo: todoSummary,
    action_type: action.action_type,
    reason_category: action.reason_category,
    reason_detail: action.reason_detail,
    ip: action.ip,
    created_at: toISOStringSafe(action.created_at),
  };

  return result;
}
