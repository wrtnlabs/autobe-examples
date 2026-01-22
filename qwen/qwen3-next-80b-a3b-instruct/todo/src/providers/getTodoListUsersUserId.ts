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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { TodoListUserTransformer } from "../transformers/TodoListUserTransformer";

export async function getTodoListUsersUserId(props: {
  userId: string;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_user.findUniqueOrThrow({
    where: { id: props.userId },
    ...TodoListUserTransformer.select(),
  });
  return await TodoListUserTransformer.transform(user);
}
