import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { TodoAppUserPasswordResetCollector } from "../collectors/TodoAppUserPasswordResetCollector";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";

export async function postTodoAppUserPasswordResets(props: {
  body: ITodoAppUserPasswordReset.ICreate;
}): Promise<ITodoAppUserPasswordReset> {
  const created = await MyGlobal.prisma.todo_app_user_password_resets.create({
    data: await TodoAppUserPasswordResetCollector.collect({
      body: props.body,
    }),
    ...TodoAppUserPasswordResetTransformer.select(),
  });
  return await TodoAppUserPasswordResetTransformer.transform(created);
}
