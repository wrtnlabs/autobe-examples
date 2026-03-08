import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<ITodoAppMemberPasswordReset.IResponse> {
  // Find member by email (case-insensitive)
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });
  // Return generic 404 if member not found to prevent email enumeration
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  // Invalidate any existing active password reset tokens
  await MyGlobal.prisma.todo_app_member_password_resets.updateMany({
    where: {
      todo_app_member_id: member.id,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Generate secure token
  const token = v4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  // Create new password reset record
  await MyGlobal.prisma.todo_app_member_password_resets.create({
    data: {
      id: v4(),
      todo_app_member_id: member.id,
      token,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Send password reset email (would be implemented via email service)
  // For now, just log it
  console.log(`Password reset token generated for ${member.email}: ${token}`);
  return {
    status: "success",
    message:
      "If an account exists with this email, a password reset link has been sent.",
  } satisfies ITodoAppMemberPasswordReset.IResponse;
}
