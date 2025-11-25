import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoAppAdministrators(props: {
  admin: AdminPayload;
  body: ITodoAppAdministrator.ICreate;
}): Promise<ITodoAppAdministrator> {
  // Check if email already exists
  const existingAdmin =
    await MyGlobal.prisma.todo_app_administrators.findUnique({
      where: { email: props.body.email },
    });

  if (existingAdmin) {
    throw new HttpException(
      "Administrator with this email already exists",
      409,
    );
  }

  // Validate role_level and status constraints
  const validRoleLevels = ["super_admin", "admin", "moderator"];
  if (!validRoleLevels.includes(props.body.role_level)) {
    throw new HttpException(
      "Invalid role_level. Must be one of: super_admin, admin, moderator",
      400,
    );
  }

  const validStatuses = ["active", "suspended", "deactivated"];
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException(
      "Invalid status. Must be one of: active, suspended, deactivated",
      400,
    );
  }

  // Create new administrator
  const created = await MyGlobal.prisma.todo_app_administrators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password_hash),
      first_name: props.body.first_name ?? null,
      last_name: props.body.last_name ?? null,
      role_level: props.body.role_level,
      status: props.body.status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    email: created.email,
    first_name: created.first_name,
    last_name: created.last_name,
    role_level: created.role_level,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
