import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoAdminPasswordResetTransformer } from "../transformers/MultiUserTodoAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminAdminsPasswordResets(props: {
  admin: AdminPayload;
  body: IMultiUserTodoAdminPasswordReset.IRequest;
}): Promise<IMultiUserTodoAdminPasswordReset> {
  // Check if admin with email exists
  const existingAdmin = await MyGlobal.prisma.multi_user_todo_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Security: If email doesn't exist, still proceed but don't create token
  if (existingAdmin === null) {
    // Return mocked response to prevent email enumeration
    // For security, we return a consistent response structure
    return {
      id: v4() as string & tags.Format<"uuid">,
      expires_at: new Date(
        Date.now() + 15 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
      used_at: null,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
      admin: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        display_name: "",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IMultiUserTodoAdmin.ISummary,
    };
  }
  // Generate reset token
  const resetTokenId = v4();
  const resetToken = v4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  // Create password reset record
  const passwordReset =
    await MyGlobal.prisma.multi_user_todo_admin_password_resets.create({
      data: {
        id: resetTokenId,
        token: resetToken,
        expires_at: expiresAt,
        used_at: null,
        created_at: now,
        updated_at: now,
        admin: { connect: { id: existingAdmin.id } },
      },
      ...MultiUserTodoAdminPasswordResetTransformer.select(),
    });
  // TODO: In production, send email with reset token
  // For now, simulate email sending - log token for debugging
  console.log(
    `Password reset token for admin ${props.body.email}: ${resetToken}`,
  );
  // Transform and return
  return MultiUserTodoAdminPasswordResetTransformer.transform(passwordReset);
}
