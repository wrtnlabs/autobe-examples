import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserProfile(props: {
  user: UserPayload;
}): Promise<ITodoAppUser> {
  const user = await MyGlobal.prisma.todo_app_users.findFirstOrThrow({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    select: TodoAppUserTransformer.select().select,
  });
  return await TodoAppUserTransformer.transform(user);
}
