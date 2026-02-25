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

export async function putTodoAppUserProfile(props: {
  user: UserPayload;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Verify user exists and is not deleted
  await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update display_name and updated_at
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.user.id },
    data: {
      display_name: props.body.display_name,
      updated_at: new Date(),
    },
  });
  // Fetch updated record and transform
  const updated = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: props.user.id },
    ...TodoAppUserTransformer.select(),
  });
  return await TodoAppUserTransformer.transform(updated);
}
