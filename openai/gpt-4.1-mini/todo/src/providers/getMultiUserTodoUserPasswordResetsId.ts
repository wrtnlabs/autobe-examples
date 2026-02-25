import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserPasswordResetTransformer } from "../transformers/MultiUserTodoUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserPasswordResetsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserPasswordReset> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_password_resets.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...MultiUserTodoUserPasswordResetTransformer.select(),
      },
    );
  if (record.multi_user_todo_user_id !== props.user.id) {
    throw new HttpException("Unauthorized", 401);
  }
  return await MultiUserTodoUserPasswordResetTransformer.transform(record);
}
