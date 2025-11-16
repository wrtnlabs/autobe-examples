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
}): Promise<ITodoListAdmin.ISummary> {
  const existing = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Administrator not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const emailExists = await MyGlobal.prisma.todo_list_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.adminId },
      },
    });

    if (emailExists) {
      throw new HttpException("Email already in use", 400);
    }
  }

  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.adminId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
