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

export async function deleteTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Verify todo exists and belongs to the requesting member
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found or access denied", 404);
  }

  const currentTime = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at timestamp
  const deletedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });

  try {
    // Create audit log entry for deletion
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_member_id: props.member.id,
        action_type: "delete_todo",
        action_description: `Todo "${existingTodo.title}" was permanently deleted by member ${props.member.id}`,
        entity_type: "todo",
        entity_id: props.todoId,
        old_values: JSON.stringify({
          id: existingTodo.id,
          title: existingTodo.title,
          status: existingTodo.status,
          priority: existingTodo.priority,
        }),
        severity_level: "info",
        session_id: props.member.session_id,
        created_at: currentTime,
        updated_at: currentTime,
      },
    });
  } catch (auditError) {
    // Log error but don't fail the deletion operation
    console.error("Failed to create audit log:", auditError);
  }

  // Return the deleted todo data including deleted_at timestamp
  return {
    id: deletedTodo.id,
    title: deletedTodo.title,
    description: deletedTodo.description ?? undefined,
    status: typia.assert<"pending" | "in_progress" | "completed" | "cancelled">(
      deletedTodo.status,
    ),
    business_status: typia.assert<"active" | "on_hold" | "archived">(
      deletedTodo.business_status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | "urgent">(
      deletedTodo.priority,
    ),
    category: deletedTodo.category ?? undefined,
    due_date: deletedTodo.due_date
      ? toISOStringSafe(deletedTodo.due_date)
      : undefined,
    completed_at: deletedTodo.completed_at
      ? toISOStringSafe(deletedTodo.completed_at)
      : undefined,
    created_at: toISOStringSafe(deletedTodo.created_at),
    updated_at: toISOStringSafe(deletedTodo.updated_at),
    deleted_at: deletedTodo.deleted_at
      ? toISOStringSafe(deletedTodo.deleted_at)
      : undefined,
  };
}
