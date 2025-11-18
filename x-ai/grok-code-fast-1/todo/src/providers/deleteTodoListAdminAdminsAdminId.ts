import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check for existence and not already deleted.
  const target = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!target || target.deleted_at !== null) {
    throw new HttpException("Admin not found or already deleted", 404);
  }

  // Prevent self-deletion for safety
  if (props.admin.id === props.adminId) {
    throw new HttpException("Admins cannot delete their own accounts.", 403);
  }

  // Mark as deleted (soft delete)
  await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });

  // Optionally: Audit logging, session invalidation could be handled elsewhere.
}
