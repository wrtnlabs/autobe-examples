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

export async function putTodoListAdminTodoListAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListAdmin.IUpdate;
}): Promise<ITodoListAdmin> {
  const existing = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.id },
  });
  if (!existing) {
    throw new HttpException("TodoListAdmin not found", 404);
  }
  const updateData: {
    email: string;
    created_at?: string;
    updated_at: string;
    deleted_at?: string;
  } = {
    email: props.body.email,
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.created_at !== null && props.body.created_at !== undefined) {
    updateData.created_at = toISOStringSafe(props.body.created_at);
  }

  if (props.body.deleted_at !== null && props.body.deleted_at !== undefined) {
    updateData.deleted_at = toISOStringSafe(props.body.deleted_at);
  }

  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.id },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
