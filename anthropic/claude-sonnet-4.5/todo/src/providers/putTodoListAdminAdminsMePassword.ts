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

export async function putTodoListAdminAdminsMePassword(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IUpdatePassword;
}): Promise<ITodoListAdmin> {
  const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.admin.id },
  });

  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    admin.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);

  const updatedAdmin = await MyGlobal.prisma.todo_list_admins.update({
    where: { id: props.admin.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });

  await MyGlobal.prisma.todo_list_admin_sessions.updateMany({
    where: {
      todo_list_admin_id: props.admin.id,
      id: { not: props.admin.session_id },
      expired_at: null,
    },
    data: {
      expired_at: new Date(),
    },
  });

  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
  };
}
