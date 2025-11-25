import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // 1. Lookup target admin, must exist and not soft deleted
  const admin = await MyGlobal.prisma.todo_app_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Admin not found or already deleted", 404);
  }

  // 2. If email is changing, enforce uniqueness (must not be on any other admin)
  if (
    typeof props.body.email === "string" &&
    props.body.email !== admin.email
  ) {
    const emailExists = await MyGlobal.prisma.todo_app_admins.findFirst({
      where: {
        email: props.body.email,
        id: {
          not: props.adminId,
        },
      },
    });
    if (emailExists) {
      throw new HttpException(
        "Email already registered to another administrator.",
        409,
      );
    }
  }

  // 3. Prepare update data (exclude id, created_at)
  // updated_at: use explicit value from input if present; else now
  const now = toISOStringSafe(new Date());
  const updated_at =
    typeof props.body.updated_at === "string" ? props.body.updated_at : now;
  const updateInput: Record<string, unknown> = {
    ...(typeof props.body.email === "string"
      ? { email: props.body.email }
      : {}),
    ...(typeof props.body.password_hash === "string"
      ? { password_hash: props.body.password_hash }
      : {}),
    updated_at,
    ...(Object.prototype.hasOwnProperty.call(props.body, "deleted_at")
      ? { deleted_at: props.body.deleted_at } // can be string|null|undefined
      : {}),
  };

  const updated = await MyGlobal.prisma.todo_app_admins.update({
    where: { id: props.adminId },
    data: updateInput,
  });

  // 4. Project output to match ITodoAppAdmin, handling undefined vs null
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(typeof updated.deleted_at === "string" ||
    updated.deleted_at instanceof Date
      ? {
          deleted_at: updated.deleted_at
            ? toISOStringSafe(updated.deleted_at)
            : null,
        }
      : { deleted_at: undefined }),
  };
}
