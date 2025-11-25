import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Look up the admin to delete (who must not already be deleted)
  const candidate = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!candidate) {
    throw new HttpException(
      "Target administrator does not exist or is already deleted.",
      404,
    );
  }

  // Soft delete the admin and expire all related sessions atomically
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_admins.update({
      where: { id: props.adminId },
      data: { deleted_at: deletedAt },
    }),
    MyGlobal.prisma.todo_app_admin_sessions.updateMany({
      where: { admin_id: props.adminId, expired_at: null },
      data: { expired_at: deletedAt },
    }),
  ]);
}
