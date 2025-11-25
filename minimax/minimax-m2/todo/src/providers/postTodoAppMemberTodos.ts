import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const { member, body } = props;

  const now = new Date();
  const dueDate = body.due_date ? new Date(body.due_date) : null;

  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: body.title,
      description: body.description,
      status: (body.status ?? "pending") as
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled",
      business_status: (body.business_status ?? "active") as
        | "active"
        | "on_hold"
        | "archived",
      priority: (body.priority ?? "medium") as
        | "low"
        | "medium"
        | "high"
        | "urgent",
      category: body.category,
      due_date: dueDate,
      todo_app_member_id: member.id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    status: created.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "cancelled",
    business_status: created.business_status as
      | "active"
      | "on_hold"
      | "archived",
    priority: created.priority as "low" | "medium" | "high" | "urgent",
    category: created.category ?? undefined,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
