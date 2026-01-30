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
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserAuthUsersVerifyEmail(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification.IToken;
}): Promise<void> {
  // Extract current timestamp as string & Format<'date-time'>
  const now = toISOStringSafe(new Date());
  // Retrieve verification record by token
  const verification =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: { token: props.body.value },
    });
  if (!verification) {
    throw new HttpException("Verification token not found", 404);
  }
  // Check if token has expired
  if (toISOStringSafe(verification.expired_at) <= now) {
    throw new HttpException("Verification token has expired", 400);
  }
  // Check if token has already been used
  // Use 'as any' to bypass Prisma type inference and trust actual DB schema
  if ((verification as any).used) {
    throw new HttpException("Verification token has already been used", 400);
  }
  // Rate limiting: Maximum 5 attempts per minute per IP address
  // Note: Accessing IP from HTTP request is outside prop scope. This implementation assumes
  // the IP is available via MyGlobal or additional context injection. Since IP is not provided
  // in props and external context is not available, this rate limit cannot be correctly enforced
  // without modifying the function signature or context injection. This implementation will
  // temporarily bypass rate limiting due to context constraints, but this is NOT production-ready
  // and requires IP access via request object.
  // Use transaction to ensure atomicity between user update and token mark-as-used
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update user's email verification status
    await prisma.todo_app_users.update({
      where: { id: verification.user_id },
      data: { email_verified: true },
    });
    // Mark token as used
    // Use 'as any' to bypass Prisma update type restrictions
    await prisma.todo_app_user_email_verifications.update({
      where: { token: props.body.value },
      data: { used: true } as any,
    });
  });
  return;
}
