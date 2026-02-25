import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoUserPasswordResets(props: {
  user: UserPayload;
  body: IMultiUserTodoUserPasswordReset.ICreate;
}): Promise<void> {
  const userRecord = await MyGlobal.prisma.multi_user_todo_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: { id: true },
  });
  if (userRecord === null) {
    throw new HttpException("User with the provided email does not exist", 404);
  }
  const token: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  ) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.multi_user_todo_user_password_resets.create({
    data: {
      id: token,
      user: { connect: { id: userRecord.id } },
      token: token,
      created_at: now,
      updated_at: now,
      expired_at: expiredAt,
    },
  });
}
