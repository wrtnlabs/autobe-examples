import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoAppTodoUserTaskTags(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTaskTag.ICreate;
}): Promise<ITodoAppTaskTag> {
  const { todoUser, body } = props;

  // Authorization: verify that the actor exists (decorator already performs JWT checks,
  // but presence of todoUser requires an explicit authorization-related DB check)
  await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: todoUser.id },
  });

  // Normalize input according to service policy: trim and lowercase
  const name = body.name.trim().toLowerCase();
  if (name.length === 0) {
    throw new HttpException("Bad Request: name must not be empty", 400);
  }

  // Prepare identifiers and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  try {
    // Enforce uniqueness against active (non-soft-deleted) tags
    const existing = await MyGlobal.prisma.todo_app_task_tags.findFirst({
      where: { name, deleted_at: null },
    });
    if (existing) {
      throw new HttpException("Conflict: tag name already exists", 409);
    }

    // Create the tag
    const created = await MyGlobal.prisma.todo_app_task_tags.create({
      data: {
        id,
        name,
        created_at: now,
        updated_at: now,
      },
    });

    // Emit audit log for the creation action
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_todouser_id: todoUser.id,
        todo_app_todouser_session_id: todoUser.session_id,
        event_type: "create",
        target_type: "task_tag",
        target_id: created.id,
        details: `created task tag '${name}'`,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      name: created.name,
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
      deletedAt: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    // Prisma unique constraint error (fallback)
    if ((error as any)?.code === "P2002") {
      throw new HttpException("Conflict: tag name already exists", 409);
    }
    console.error("postTodoAppTodoUserTaskTags error:", error);
    throw new HttpException("Internal Server Error", 500);
  }
}
