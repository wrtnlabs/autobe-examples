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
  const displayName = props.body.display_name;
  if (displayName !== undefined && displayName !== null) {
    if (displayName.length < 1 || displayName.length > 30) {
      throw new HttpException(
        "Display name must be between 1 and 30 characters",
        400,
      );
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(displayName)) {
      throw new HttpException(
        "Display name can only contain alphanumeric characters and spaces",
        400,
      );
    }
  }
  const user = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.user.id },
    data: {
      display_name: displayName,
      updated_at: new Date(),
      sessions: { set: [] },
      passwordResets: { set: [] },
      emailVerifications: { set: [] },
      todos: { set: [] },
    },
    include: {
      sessions: true,
      passwordResets: true,
      emailVerifications: true,
      todos: true,
    },
  });
  return await TodoAppUserTransformer.transform(user);
}
