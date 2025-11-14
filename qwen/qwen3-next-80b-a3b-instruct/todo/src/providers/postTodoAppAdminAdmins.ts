import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoAppAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const createdAdmin = await MyGlobal.prisma.todo_app_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: props.body.password_hash,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    id: createdAdmin.id,
    email: createdAdmin.email,
    password_hash: createdAdmin.password_hash,
    created_at: toISOStringSafe(now),
    last_password_change: toISOStringSafe(now),
    recovery_email: props.body.email,
    timezone: "UTC",
    password_reset_token: v4(),
    password_reset_expires: toISOStringSafe(expiresAt),
    last_login: toISOStringSafe(now),
    is_active: true,
  };
}
