import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { body } = props;

  // Duplicate email check
  const existing = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Conflict: email already exists", 409);

  // Hash password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create admin
  const created = await MyGlobal.prisma.todo_app_admin.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: passwordHash,
      is_super: body.is_super ?? false,
      created_at: now,
      last_active_at: null,
    },
  });

  // Record audit entry
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: created.id,
      actor_role: "system",
      action_type: "create_admin",
      target_resource: "todo_app_admin",
      target_id: created.id,
      reason: null,
      created_at: now,
    },
  });

  // Generate tokens
  const access = jwt.sign(
    { adminId: created.id, email: created.email, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    { adminId: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const expired_at = toISOStringSafe(new Date(Date.now() + 1 * 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    is_super: created.is_super,
    created_at: toISOStringSafe(created.created_at),
    last_active_at: created.last_active_at
      ? toISOStringSafe(created.last_active_at)
      : null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
