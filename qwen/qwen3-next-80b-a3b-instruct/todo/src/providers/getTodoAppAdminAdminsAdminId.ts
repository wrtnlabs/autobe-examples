import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdmin> {
  const admin = await MyGlobal.prisma.todo_app_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    password_hash: admin.password_hash,
  };
}
