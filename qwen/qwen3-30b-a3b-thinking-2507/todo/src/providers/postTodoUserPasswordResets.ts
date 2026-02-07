import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoUserPasswordResetCollector } from "../collectors/TodoUserPasswordResetCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserPasswordResetTransformer } from "../transformers/TodoUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoUserPasswordResets(props: {
  user: UserPayload;
  body: ITodoUserPasswordReset.ICreate;
}): Promise<ITodoUserPasswordReset> {
  const collected = await TodoUserPasswordResetCollector.collect({
    body: props.body,
    todoUsers: { id: props.user.id },
  });
  const record = await MyGlobal.prisma.todo_user_password_resets.create({
    data: {
      id: collected.id,
      token: collected.token,
      expires_at: collected.expires_at,
      used_at: collected.used_at,
      created_at: collected.created_at,
      updated_at: collected.updated_at,
      user: collected.user,
    },
  });
  return await TodoUserPasswordResetTransformer.transform(record);
}
