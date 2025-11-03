import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postAuthTodoUserMfaEnable(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTodoUser.IEnableMfa;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { todoUser, body } = props;

  // Fetch and validate ownership
  const user = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: todoUser.id },
  });

  // Provisioning material generation
  const rawSecret = v4().replace(/-/g, "").slice(0, 32).toUpperCase();
  const otpauthUrl = `otpauth://totp/TodoApp:${user.email}?secret=${rawSecret}&issuer=TodoApp&algorithm=SHA1&digits=6&period=30`;
  const backupCodes = Array.from({ length: 8 }).map(() =>
    v4().replace(/-/g, "").slice(0, 8).toUpperCase(),
  );

  try {
    // Encrypt sensitive artifacts for storage
    const encryptedSecret = await PasswordUtil.hash(rawSecret);
    const encryptedBackupCodes = await PasswordUtil.hash(
      JSON.stringify(backupCodes),
    );

    const enableNow = body.requireVerification === false;
    const now = toISOStringSafe(new Date());

    // Persist encrypted data inline
    await MyGlobal.prisma.todo_app_todouser.update({
      where: { id: todoUser.id },
      data: {
        mfa_secret: encryptedSecret,
        mfa_backup_codes: encryptedBackupCodes,
        mfa_enabled: enableNow,
        updated_at: now,
      },
    });

    // Record an activity log for provisioning (no secret stored in log)
    await MyGlobal.prisma.todo_app_user_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_todouser_id: todoUser.id,
        activity_type: "mfa.provisioned",
        details: `MFA provisioning initiated${enableNow ? " and enabled" : " (verification required)"}`,
        created_at: now,
        updated_at: now,
      },
    });

    // Return sanitized summary
    const updated = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
      where: { id: todoUser.id },
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
  } catch (err) {
    throw new HttpException(
      (err && (err as Error).message) || "Internal Server Error",
      500,
    );
  }
}
