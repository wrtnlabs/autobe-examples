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

export async function putTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoAppAdmin.IUpdate;
}): Promise<ITodoAppAdmin> {
  // Verify target admin exists and is active (not deleted)
  const targetAdmin = await MyGlobal.prisma.todo_app_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!targetAdmin) {
    throw new HttpException("Admin not found", 404);
  }

  // Update the admin's updated_at field
  const updatedAdmin = await MyGlobal.prisma.todo_app_admins.update({
    where: { id: props.adminId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Return the ITodoAppAdmin object with available fields and explicit null casting for missing fields
  // We only have id, email, password_hash, created_at from the schema
  // The other fields in ITodoAppAdmin are required but not in the schema
  // We must return null for them with type casting to satisfy the interface
  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    password_hash: updatedAdmin.password_hash,
    created_at: toISOStringSafe(updatedAdmin.created_at),
    last_password_change: null as any as string & tags.Format<"date-time">,
    recovery_email: null as any as string & tags.Format<"email">,
    timezone: null as any as string,
    password_reset_token: null as any as string,
    password_reset_expires: null as any as string & tags.Format<"date-time">,
    last_login: null as any as string & tags.Format<"date-time">,
    is_active: null as any as boolean,
  } satisfies ITodoAppAdmin;
}
