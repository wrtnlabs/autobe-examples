import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdmin> {
  const existing = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!existing) {
    throw new HttpException("Administrator account not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Administrator account is already deleted", 400);
  }

  const currentTime = new Date();
  const deleted = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });

  return {
    id: deleted.id,
    email: deleted.email,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: toISOStringSafe(deleted.deleted_at!),
  };
}
