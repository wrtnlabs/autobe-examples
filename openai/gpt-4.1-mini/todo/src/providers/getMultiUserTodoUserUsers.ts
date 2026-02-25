import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserTransformer } from "../transformers/MultiUserTodoUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserUsers(props: {
  user: UserPayload;
}): Promise<IMultiUserTodoUser> {
  try {
    const userRecord =
      await MyGlobal.prisma.multi_user_todo_users.findFirstOrThrow({
        where: {
          id: props.user.id,
          deleted_at: null,
        },
        include: {
          sessions: true,
          userPasswordResets: true,
          emailVerifications: true,
          todos: true,
        },
      });
    // Pass the raw userRecord directly to the transformer.
    return await MultiUserTodoUserTransformer.transform(userRecord);
  } catch {
    throw new HttpException("Unauthorized", 401);
  }
}
