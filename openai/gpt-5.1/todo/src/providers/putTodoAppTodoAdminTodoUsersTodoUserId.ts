import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function putTodoAppTodoAdminTodoUsersTodoUserId(props: {
  todoAdmin: TodoadminPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoAppTodoUser.IUpdate;
}): Promise<ITodoAppTodoUser> {
  const { todoUserId, body } = props;

  // Ensure the target todo user exists before attempting update
  const existing = await MyGlobal.prisma.todo_app_todousers.findUnique({
    where: { id: todoUserId },
  });

  if (existing === null) {
    throw new HttpException("Todo user not found", 404);
  }

  try {
    const updated = await MyGlobal.prisma.todo_app_todousers.update({
      where: { id: todoUserId },
      data: {
        ...(body.email !== undefined && { email: body.email }),
        ...(body.display_name !== undefined && {
          display_name: body.display_name,
        }),
        ...(body.status !== undefined && { status: body.status }),
        // Always refresh updated_at when an update occurs
        updated_at: toISOStringSafe(new Date()),
      },
    });

    const lastLoginAt = updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null;

    return {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name,
      status: updated.status,
      last_login_at: lastLoginAt,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation, likely on email
        throw new HttpException("Email is already in use", 409);
      }
      if (error.code === "P2025") {
        // Record to update not found
        throw new HttpException("Todo user not found", 404);
      }
    }

    throw error;
  }
}
