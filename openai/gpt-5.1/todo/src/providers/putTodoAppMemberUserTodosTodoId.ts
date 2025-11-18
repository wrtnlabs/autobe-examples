import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Ensure the todo exists, belongs to this member user, and is not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Determine which fields are explicitly present in the request body
  const hasTitle = Object.prototype.hasOwnProperty.call(props.body, "title");
  const hasDescription = Object.prototype.hasOwnProperty.call(
    props.body,
    "description",
  );
  const hasStatus = Object.prototype.hasOwnProperty.call(props.body, "status");

  const nowIso = toISOStringSafe(new Date());

  // Manage lifecycle of completed_at based on status transition
  let completedAtToSet: string | null | undefined = undefined;

  if (hasStatus) {
    const nextStatus =
      props.body.status === undefined ? existing.status : props.body.status;
    const prevStatus = existing.status;
    const wasCompleted = prevStatus === "completed";
    const willBeCompleted = nextStatus === "completed";

    if (!wasCompleted && willBeCompleted) {
      // Transition into completed state: set completed_at when not already set
      if (existing.completed_at === null) {
        completedAtToSet = nowIso;
      }
    } else if (wasCompleted && !willBeCompleted) {
      // Reopen from completed state: clear completed_at
      completedAtToSet = null;
    }
  }

  const data = {
    ...(hasTitle && props.body.title !== undefined
      ? { title: props.body.title }
      : {}),
    ...(hasDescription
      ? {
          // When description is omitted we keep existing value;
          // when provided (even null), we apply that value.
          description:
            props.body.description === undefined
              ? existing.description
              : props.body.description,
        }
      : {}),
    ...(hasStatus && props.body.status !== undefined
      ? { status: props.body.status }
      : {}),
    updated_at: nowIso,
    ...(completedAtToSet !== undefined
      ? { completed_at: completedAtToSet }
      : {}),
  };

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data,
    include: {
      memberUser: true,
    },
  });

  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: updated.memberUser.id,
    email: updated.memberUser.email,
    display_name:
      updated.memberUser.display_name === null
        ? null
        : updated.memberUser.display_name,
    status: updated.memberUser.status,
    last_login_at:
      updated.memberUser.last_login_at === null
        ? null
        : toISOStringSafe(updated.memberUser.last_login_at),
  };

  const result: ITodoAppTodo = {
    id: updated.id,
    memberUser: memberUserSummary,
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };

  return result;
}
