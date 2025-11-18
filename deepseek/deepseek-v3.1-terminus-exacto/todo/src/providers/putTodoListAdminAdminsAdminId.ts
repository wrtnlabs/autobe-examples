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
  // Fetch current admin record
  const current = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!current) {
    throw new HttpException("Administrator not found.", 404);
  }

  // Enforce unique email if updating email
  if (props.body.email) {
    const conflict = await MyGlobal.prisma.todo_list_admins.findFirst({
      where: { email: props.body.email, id: { not: props.adminId } },
    });
    if (conflict) {
      throw new HttpException(
        "This email is already in use by another administrator.",
        409,
      );
    }
  }

  // Only allow deleting_at to be explicitly reset to null
  if (
    "deleted_at" in props.body &&
    props.body.deleted_at !== null &&
    props.body.deleted_at !== undefined
  ) {
    throw new HttpException(
      "This endpoint only permits resetting deleted_at to null.",
      400,
    );
  }

  const updateData: {
    email?: string;
    password_hash?: string;
    locked?: boolean;
    role?: string;
    deleted_at?: null;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.locked !== undefined) {
    updateData.locked = props.body.locked;
  }
  if (props.body.role !== undefined) {
    updateData.role = props.body.role;
  }
  if ("deleted_at" in props.body && props.body.deleted_at === null) {
    updateData.deleted_at = null;
  }
  if (props.body.password) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    locked: updated.locked,
    role: updated.role,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
