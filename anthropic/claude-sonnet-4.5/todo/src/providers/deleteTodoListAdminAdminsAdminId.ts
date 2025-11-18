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
  // Prevent an admin from deleting themselves
  if (props.admin.id === props.adminId) {
    throw new HttpException(
      "Administrators cannot delete their own account.",
      403,
    );
  }

  // Look up the target admin
  const targetAdmin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!targetAdmin) {
    throw new HttpException("Administrator account not found.", 404);
  }

  // Execute deletion and insert audit log transactionally
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_admins.delete({
      where: { id: props.adminId },
    }),
    MyGlobal.prisma.todo_list_admin_audit_logs.create({
      data: {
        id: v4(),
        admin_id: props.admin.id,
        user_id: null,
        todo_id: null,
        action_type: "delete",
        request_context: null,
        created_at: now,
      },
    }),
  ]);
}
