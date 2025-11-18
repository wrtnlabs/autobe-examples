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

export async function putTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdmin.IUpdate;
}): Promise<ITodoListAdmin> {
  // Find the target admin (to be updated)
  const target = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!target) {
    throw new HttpException("Administrator not found", 404);
  }

  // Check email uniqueness if updating email
  if (props.body.email !== undefined && props.body.email !== target.email) {
    const conflict = await MyGlobal.prisma.todo_list_admins.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.adminId },
      },
    });
    if (conflict) {
      throw new HttpException("Admin email must be unique", 409);
    }
  }

  // Prepare update object immutably
  const updateData = {
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.password !== undefined && {
      password_hash: await PasswordUtil.hash(props.body.password),
    }),
    ...(props.body.disabled_at !== undefined && {
      disabled_at: props.body.disabled_at,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  const admin = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: updateData,
  });

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    disabled_at:
      admin.disabled_at !== null
        ? toISOStringSafe(admin.disabled_at)
        : undefined,
  };
}
