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

export async function postTodoAppMemberUserTodosTodoIdComplete(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Fetch the todo with its owning member user for ownership check and DTO mapping
  const existing = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    include: {
      memberUser: true,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Soft-deleted todos cannot be completed
  if (existing.deleted_at !== null) {
    throw new HttpException(
      "Todo has been deleted and cannot be completed",
      400,
    );
  }

  // Enforce ownership: only the owning member user can complete their todo
  if (existing.todo_app_memberuser_id !== props.memberUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Determine if the todo is already completed (idempotent behavior)
  const isAlreadyCompleted: boolean = existing.status === "completed";

  // Perform state transition only when not already completed
  const target = isAlreadyCompleted
    ? existing
    : await MyGlobal.prisma.todo_app_todos.update({
        where: { id: props.todoId },
        data: {
          status: "completed",
          // We intentionally do not manipulate timestamp fields here. It is
          // assumed that either the database manages these columns (e.g., via
          // triggers/defaults) or they remain consistent with existing values.
        },
        include: {
          memberUser: true,
        },
      });

  const toOptionalNullableDateTime = (
    value:
      | string
      | null
      | undefined
      | (object & { constructor: { name: string } }),
  ): (string & tags.Format<"date-time">) | null | undefined => {
    if (value === null || value === undefined) return value as null | undefined;

    // When Prisma returns Date objects, convert them to ISO string using
    // pre-provided helper. We avoid using Date type directly in signatures.
    const raw: string =
      typeof value === "object" && (value as any).constructor?.name === "Date"
        ? toISOStringSafe(value as any)
        : (value as string);

    return raw as string & tags.Format<"date-time">;
  };

  const toRequiredDateTime = (
    value: string | (object & { constructor: { name: string } }),
  ): string & tags.Format<"date-time"> => {
    const raw: string =
      typeof value === "object" && (value as any).constructor?.name === "Date"
        ? toISOStringSafe(value as any)
        : (value as string);

    return raw as string & tags.Format<"date-time">;
  };

  // Build ITodoAppTodo DTO from Prisma record
  const dto: ITodoAppTodo = {
    id: target.id as string & tags.Format<"uuid">,
    memberUser: {
      id: target.memberUser.id as string & tags.Format<"uuid">,
      email: target.memberUser.email as string & tags.Format<"email">,
      display_name:
        target.memberUser.display_name === null
          ? null
          : target.memberUser.display_name,
      status: target.memberUser.status,
      last_login_at: toOptionalNullableDateTime(
        target.memberUser.last_login_at as any,
      ),
    },
    title: target.title,
    description:
      target.description === null || target.description === undefined
        ? null
        : target.description,
    status: target.status,
    created_at: toRequiredDateTime(target.created_at as any),
    updated_at: toRequiredDateTime(target.updated_at as any),
    completed_at: toOptionalNullableDateTime(target.completed_at as any),
    deleted_at: toOptionalNullableDateTime(target.deleted_at as any),
  };

  return dto;
}
