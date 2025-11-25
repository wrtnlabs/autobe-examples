import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const existing = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }

  const updateFields: Record<string, unknown> = {};
  if (props.body.email !== undefined) {
    updateFields.email = props.body.email;
  }
  if (props.body.display_name !== undefined) {
    updateFields.display_name = props.body.display_name;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "deleted_at")) {
    updateFields.deleted_at = props.body.deleted_at;
  }
  updateFields.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: updateFields,
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : typeof updated.deleted_at === "string"
          ? updated.deleted_at
          : updated.deleted_at === undefined
            ? undefined
            : toISOStringSafe(updated.deleted_at),
  };
}
