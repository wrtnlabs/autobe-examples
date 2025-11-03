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

export async function postAuthTodoUserMfaDisable(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTodoUser.IDisableMfa;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { todoUser, body } = props;

  // Retrieve actor record
  const user = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: todoUser.id },
  });

  // If account is removed, respond 404 to avoid leaking existence
  if (user.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Step-up verification: current password must match
  const passwordValid = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Unauthorized: invalid password", 403);
  }

  // Prepare a single timestamp value for both update and audit
  const now = toISOStringSafe(new Date());

  // Disable MFA and clear persisted secrets
  const updated = await MyGlobal.prisma.todo_app_todouser.update({
    where: { id: todoUser.id },
    data: {
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      updated_at: now,
    },
  });

  // Record audit log for compliance (associate session when available)
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      event_type: "mfa_disabled",
      details: body.sessionHandle ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return sanitized summary; sensitive fields omitted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    displayName: updated.display_name ?? null,
    isVerified: updated.is_verified,
    status: updated.status ?? undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
