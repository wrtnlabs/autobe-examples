import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function putTodoAppTodoAdminTodoAdminsTodoAdminId(props: {
  todoAdmin: TodoadminPayload;
  todoAdminId: string & tags.Format<"uuid">;
  body: ITodoAppTodoAdmin.IUpdate;
}): Promise<ITodoAppTodoAdmin> {
  const { todoAdminId, body } = props;

  const existing = await MyGlobal.prisma.todo_app_todoadmins.findUnique({
    where: { id: todoAdminId },
  });

  if (existing === null) {
    throw new HttpException("Admin not found", 404);
  }

  if (
    body.status !== undefined &&
    existing.status === "CLOSED" &&
    body.status === "ACTIVE"
  ) {
    throw new HttpException(
      "Cannot transition status from CLOSED to ACTIVE",
      400,
    );
  }

  try {
    const updated = await MyGlobal.prisma.todo_app_todoadmins.update({
      where: { id: todoAdminId },
      data: {
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.display_name !== undefined
          ? { display_name: body.display_name }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    const result: ITodoAppTodoAdmin = {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name === null ? null : updated.display_name,
      status: updated.status,
      last_login_at:
        updated.last_login_at === null
          ? null
          : toISOStringSafe(updated.last_login_at),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = error.meta && (error.meta as { target?: unknown }).target;
      const targetList = Array.isArray(target)
        ? target
        : typeof target === "string"
          ? [target]
          : [];

      if (
        targetList.some(
          (name) =>
            name === "email" || name === "todo_app_todoadmins_email_key",
        )
      ) {
        throw new HttpException("Email already in use", 400);
      }
    }

    throw error;
  }
}
