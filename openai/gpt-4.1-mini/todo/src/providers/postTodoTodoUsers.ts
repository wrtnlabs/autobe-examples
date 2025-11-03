import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function postTodoTodoUsers(props: {
  body: ITodoUser.ICreate;
}): Promise<ITodoUser> {
  const { email, password } = props.body;

  const existing = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const password_hash = await PasswordUtil.hash(password);

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_users.create({
    data: {
      id,
      email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
