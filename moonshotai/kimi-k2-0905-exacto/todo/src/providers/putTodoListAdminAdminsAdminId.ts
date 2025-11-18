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
  // Fetch the target admin record
  const existing = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!existing) {
    throw new HttpException("Admin not found.", 404);
  }

  // Check if the request is for self or RBAC controls (additional RBAC checks may go here)
  // It's possible for now to allow any valid admin actor. Enforce lock later as needed.

  // Prepare update object (immutably)
  const update: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "email")) {
    if (
      typeof props.body.email === "string" &&
      props.body.email !== existing.email
    ) {
      // Check for unique email constraint
      const emailExists = await MyGlobal.prisma.todo_list_admins.findFirst({
        where: { email: props.body.email, id: { not: props.adminId } },
      });
      if (emailExists) {
        throw new HttpException(
          "That email is already used by another admin.",
          409,
        );
      }
      update.email = props.body.email;
    }
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "is_locked")) {
    update.is_locked = props.body.is_locked;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "password")) {
    if (typeof props.body.password === "string") {
      // Hash new password
      const hash = await PasswordUtil.hash(props.body.password);
      update.password_hash = hash;
    }
  }

  // Always update updated_at
  update.updated_at = toISOStringSafe(new Date());

  // Perform the update
  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: update,
  });

  return {
    id: updated.id,
    email: updated.email,
    is_locked: updated.is_locked,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
