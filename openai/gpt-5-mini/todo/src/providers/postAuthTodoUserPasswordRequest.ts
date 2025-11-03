import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function postAuthTodoUserPasswordRequest(props: {
  body: ITodoAppTodoUser.IPasswordResetRequest;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { body } = props;
  const { email } = body;

  const user = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { email },
  });

  if (!user) {
    // Security: avoid account enumeration by returning a random summary when email is not found
    return typia.random<ITodoAppTodoUser.ISummary>();
  }

  const token = v4() as string & tags.Format<"uuid">;
  const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

  await MyGlobal.prisma.todo_app_todouser.update({
    where: { id: user.id },
    data: {
      password_reset_token: token,
      password_reset_expires_at: expiresAt,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Best-effort email notification (do not fail the operation on email errors)
  try {
    if (
      (MyGlobal as any).mailer &&
      typeof (MyGlobal as any).mailer.send === "function"
    ) {
      await (MyGlobal as any).mailer.send({
        to: user.email,
        subject: "Password reset instructions",
        body:
          `To reset your password, visit the following link:

` + `https://example.com/auth/todoUser/password/reset?token=${token}`,
      });
    }
  } catch {
    // swallow
  }

  const updated = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      display_name: true,
      is_verified: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    displayName: updated.display_name ?? null,
    isVerified: updated.is_verified,
    status: updated.status ?? undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
