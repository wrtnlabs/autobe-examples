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

export async function postAuthAdminLogin(props: {
  body: ITodoAppAdmin.ILogin;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { body } = props;

  try {
    // Find admin by unique email
    const admin = await MyGlobal.prisma.todo_app_admin.findUnique({
      where: { email: body.email },
    });

    // If admin not found, record failed login and deny
    if (!admin) {
      await MyGlobal.prisma.todo_app_audit_records.create({
        data: {
          id: v4(),
          admin_id: null,
          user_id: null,
          actor_role: "admin",
          action_type: "admin_login_failed",
          target_resource: "admin",
          target_id: null,
          reason: null,
          created_at: toISOStringSafe(new Date()),
        },
      });

      throw new HttpException("Invalid credentials", 401);
    }

    if (!admin.password_hash) {
      await MyGlobal.prisma.todo_app_audit_records.create({
        data: {
          id: v4(),
          admin_id: admin.id,
          user_id: null,
          actor_role: "admin",
          action_type: "admin_login_failed",
          target_resource: "admin",
          target_id: admin.id,
          reason: "missing_password_hash",
          created_at: toISOStringSafe(new Date()),
        },
      });

      throw new HttpException("Invalid credentials", 401);
    }

    const isValid = await PasswordUtil.verify(
      body.password,
      admin.password_hash,
    );
    if (!isValid) {
      await MyGlobal.prisma.todo_app_audit_records.create({
        data: {
          id: v4(),
          admin_id: admin.id,
          user_id: null,
          actor_role: "admin",
          action_type: "admin_login_failed",
          target_resource: "admin",
          target_id: admin.id,
          reason: "wrong_password",
          created_at: toISOStringSafe(new Date()),
        },
      });

      throw new HttpException("Invalid credentials", 401);
    }

    // Successful authentication - prepare timestamps
    const now = toISOStringSafe(new Date());

    // Update last_active_at
    await MyGlobal.prisma.todo_app_admin.update({
      where: { id: admin.id },
      data: { last_active_at: now },
    });

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: admin.id,
        type: "admin",
        email: admin.email,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: admin.id,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    // Compute ISO expiry timestamps
    const accessExpiresAt = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshExpiresAt = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    // Create audit record for successful login
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4(),
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "admin_login",
        target_resource: "admin",
        target_id: admin.id,
        reason: null,
        created_at: now,
      },
    });

    // Build token structure
    const token = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken;

    // Build authorized response
    const authorized: ITodoAppAdmin.IAuthorized = {
      id: admin.id,
      email: admin.email,
      is_super: admin.is_super,
      created_at: toISOStringSafe(admin.created_at),
      last_active_at: now,
      token,
    };

    return authorized;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Unexpected errors
    throw new HttpException("Internal Server Error", 500);
  }
}
