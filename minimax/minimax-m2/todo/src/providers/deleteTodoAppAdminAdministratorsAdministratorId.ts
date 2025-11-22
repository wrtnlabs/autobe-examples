import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminAdministratorsAdministratorId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify target administrator exists and is active
  const targetAdministrator =
    await MyGlobal.prisma.todo_app_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
    });

  if (!targetAdministrator) {
    throw new HttpException("Administrator not found or already deleted", 404);
  }

  // Prevent self-deletion for security
  if (targetAdministrator.id === props.admin.id) {
    throw new HttpException(
      "Cannot delete your own administrator account",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.todo_app_administrators.update({
    where: { id: props.administratorId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
