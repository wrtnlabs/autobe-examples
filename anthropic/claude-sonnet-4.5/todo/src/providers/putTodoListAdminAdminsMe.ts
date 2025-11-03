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

export async function putTodoListAdminAdminsMe(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IUpdate;
}): Promise<ITodoListAdmin> {
  const { admin, body } = props;

  // Check email uniqueness if email is being updated
  if (body.email !== undefined) {
    const existingAdmin = await MyGlobal.prisma.todo_list_admins.findFirst({
      where: {
        email: body.email,
        id: { not: admin.id },
        deleted_at: null,
      },
    });

    if (existingAdmin !== null) {
      throw new HttpException("Email already in use by another admin", 409);
    }
  }

  // Hash password if provided
  const passwordHash =
    body.password !== undefined
      ? await PasswordUtil.hash(body.password)
      : undefined;

  // Update the admin record with inline data object
  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: admin.id },
    data: {
      email: body.email ?? undefined,
      password_hash: passwordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated admin profile with proper date conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
