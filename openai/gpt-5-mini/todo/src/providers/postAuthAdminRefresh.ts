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

export async function postAuthAdminRefresh(props: {
  body: ITodoAppAdmin.IRefresh;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { body } = props;
  const { refresh_token } = body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid refresh token", 401);
  }

  const payload =
    decoded && typeof decoded === "object"
      ? (decoded as Record<string, unknown>)
      : undefined;
  const adminId =
    payload?.id ?? payload?.adminId ?? payload?.userId ?? payload?.sub;
  if (!adminId || typeof adminId !== "string") {
    throw new HttpException("Invalid refresh token", 401);
  }

  const admin = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: adminId },
  });
  if (!admin) throw new HttpException("Invalid refresh token", 401);

  const now = toISOStringSafe(new Date());

  // Update last_active_at
  await MyGlobal.prisma.todo_app_admin.update({
    where: { id: admin.id },
    data: { last_active_at: now },
  });

  // Audit the refresh usage
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      user_id: null,
      actor_role: "admin",
      action_type: "refresh_token_used",
      target_resource: "admin",
      target_id: admin.id,
      reason: null,
      created_at: now,
    },
  });

  // Create tokens
  const accessPayload = {
    id: admin.id,
    type: "admin",
    email: admin.email,
    is_super: admin.is_super,
  };

  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refresh = jwt.sign(
    { id: admin.id, type: "admin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: admin.id,
    email: admin.email,
    is_super: admin.is_super,
    created_at: toISOStringSafe(admin.created_at),
    last_active_at: now,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
