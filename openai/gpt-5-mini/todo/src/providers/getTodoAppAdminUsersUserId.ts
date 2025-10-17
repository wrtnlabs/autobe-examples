import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  const { admin, userId } = props;

  // Authorization: verify admin still exists in the database
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true },
  });

  if (adminRecord === null) {
    throw new HttpException("Unauthorized", 403);
  }

  // Retrieve user. Explicitly select only non-sensitive fields.
  const user = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      display_name: true,
      account_status: true,
      created_at: true,
      updated_at: true,
      last_active_at: true,
    },
  });

  if (user === null) {
    throw new HttpException("Not Found", 404);
  }

  // Prepare audit timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Record admin access for auditability
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      user_id: userId,
      actor_role: "admin",
      action_type: "read_user",
      target_resource: "user",
      target_id: userId,
      reason: null,
      created_at: now,
    },
  });

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? null,
    account_status: user.account_status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    last_active_at: user.last_active_at
      ? toISOStringSafe(user.last_active_at)
      : null,
  };
}
