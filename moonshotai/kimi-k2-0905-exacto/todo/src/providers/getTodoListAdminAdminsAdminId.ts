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

export async function getTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdmin> {
  const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  // Only return safe, non-sensitive fields as per ITodoListAdmin DTO
  return {
    id: admin.id,
    email: admin.email,
    is_locked: admin.is_locked,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  };
}
