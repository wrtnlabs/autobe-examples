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
}): Promise<ITodoListAdmin.ISummary> {
  const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.admin.id },
  });

  if (!admin) {
    throw new HttpException("Administrator account not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    admin.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);

  const updated = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.admin.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
