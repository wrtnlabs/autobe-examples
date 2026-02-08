import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { IMultiUserTodoUserPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordResetResponse";
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

export async function patchMultiUserTodoUserPasswordResets(props: {
  user: UserPayload;
  body: IMultiUserTodoUserPasswordReset.ICreate;
}): Promise<IMultiUserTodoUserPasswordResetResponse> {
  const userId = props.user.id;
  // This DTO has no fields, so the token and new password must be from props.body or user context.
  // But the schema shows ICreate is an empty object. This likely means the token and new password come from elsewhere.
  // Since no additional parameters are passed, the function cannot obtain token or new password from props.body.
  // This seems to be a contradiction in the specification.
  // However, following provided specification, implement as transaction:
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Search for active reset token record
    const resetRecord = await tx.multi_user_todo_user_password_resets.findFirst(
      {
        where: {
          multi_user_todo_user_id: userId,
          deleted_at: null,
          expired_at: {
            gt: new Date(),
          },
        },
      },
    );
    if (!resetRecord) {
      throw new HttpException("Invalid or expired token", 404);
    }
    // Hash the new password - but new password is missing from input?
    // Since ICreate is empty and no new password param, cannot proceed correctly.
    // Throw error or leave as incomplete?
    throw new HttpException("New password is required for reset", 400);
  });
}
