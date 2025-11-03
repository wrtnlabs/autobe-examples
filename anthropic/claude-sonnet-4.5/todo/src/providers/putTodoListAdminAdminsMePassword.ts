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

export async function putTodoListAdminAdminsMePassword(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IChangePassword;
}): Promise<void> {
  const { admin, body } = props;

  const adminRecord = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Admin account not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    adminRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 403);
  }

  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  await MyGlobal.prisma.todo_list_admins.update({
    where: { id: admin.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
