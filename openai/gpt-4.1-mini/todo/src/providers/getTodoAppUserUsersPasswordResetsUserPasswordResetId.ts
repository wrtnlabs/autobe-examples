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
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";

export async function getTodoAppUserUsersPasswordResetsUserPasswordResetId(props: {
  user: UserPayload;
  userPasswordResetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { id: props.userPasswordResetId },
      ...TodoAppUserPasswordResetTransformer.select(),
    });
  if (!passwordReset) {
    throw new HttpException("User password reset record not found", 404);
  }
  return await TodoAppUserPasswordResetTransformer.transform(passwordReset);
}
