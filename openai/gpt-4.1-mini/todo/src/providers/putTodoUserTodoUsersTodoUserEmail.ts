import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodoUsersTodoUserEmail(props: {
  user: UserPayload;
  todoUserEmail: string;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  const userRecord = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email: props.todoUserEmail,
      deleted_at: null,
    },
  });

  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }

  if (userRecord.id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: Cannot update other user's account",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_users.update({
    where: { email: props.todoUserEmail },
    data: {
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
