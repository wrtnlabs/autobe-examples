import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
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

export async function patchTodoAppUserPasswordResets(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification;
}): Promise<ITodoAppUserPasswordReset> {
  // Find the user by email - return early without revealing existence
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { email: props.body.email },
    select: { id: true },
  });
  // Generate a unique reset token (UUID)
  const token = v4();
  // Calculate expiration: 2 hours from now
  const expiresAt = toISOStringSafe(new Date(Date.now() + 2 * 60 * 60 * 1000));
  // Store reset record in todo_app_user_password_resets table if user exists
  if (user) {
    await MyGlobal.prisma.todo_app_user_password_resets.create({
      data: {
        id: v4(),
        user_id: user.id,
        token,
        expires_at: expiresAt,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Log audit trail with anonymized user_id if user exists
  // (Audit logging handled via background job - not part of this function)
  // Return empty response to prevent email enumeration
  return {};
}
