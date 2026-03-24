import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMember.IEmailVerification;
}): Promise<ITodoAppMember.IEmailVerificationResult> {
  const invalidTokenError = () =>
    new HttpException("Invalid or expired token", 400);
  const now = new Date();
  const verification =
    await MyGlobal.prisma.todo_app_member_email_verifications.findUnique({
      where: { token: props.body.token },
      select: {
        id: true,
        todo_app_member_id: true,
        expired_at: true,
        used_at: true,
        deleted_at: true,
      },
    });
  if (
    verification === null ||
    verification.deleted_at !== null ||
    verification.used_at !== null ||
    verification.expired_at.getTime() <= now.getTime()
  ) {
    throw invalidTokenError();
  }
  if (verification.todo_app_member_id !== props.member.id) {
    // Generic rejection to avoid leaking whether token exists for other members.
    throw invalidTokenError();
  }
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      const fresh = await tx.todo_app_member_email_verifications.findUnique({
        where: { token: props.body.token },
        select: {
          id: true,
          todo_app_member_id: true,
          expired_at: true,
          used_at: true,
          deleted_at: true,
        },
      });
      if (
        fresh === null ||
        fresh.deleted_at !== null ||
        fresh.used_at !== null ||
        fresh.expired_at.getTime() <= now.getTime() ||
        fresh.todo_app_member_id !== props.member.id
      ) {
        throw invalidTokenError();
      }
      await tx.todo_app_member_email_verifications.update({
        where: { token: props.body.token },
        data: {
          used_at: now,
          updated_at: now,
        },
      });
    });
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Email verification failed", 500);
  }
  return {
    success: true,
    message: "Email verification successful.",
  };
}
