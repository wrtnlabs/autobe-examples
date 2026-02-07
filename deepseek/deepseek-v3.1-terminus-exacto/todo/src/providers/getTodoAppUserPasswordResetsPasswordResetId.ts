import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserPasswordResetsPasswordResetId(props: {
  user: UserPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: {
        id: props.passwordResetId,
        deleted_at: null, // Exclude soft-deleted records
        todo_app_user_id: props.user.id, // Ensure user can only access their own records
      },
      ...TodoAppUserPasswordResetTransformer.select(),
    });
  if (!passwordReset) {
    throw new HttpException("Password reset record not found", 404);
  }
  return await TodoAppUserPasswordResetTransformer.transform(passwordReset);
}
