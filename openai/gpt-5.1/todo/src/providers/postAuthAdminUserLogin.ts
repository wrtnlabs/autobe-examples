import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserLogin(props: {
  body: ITodoAppAdminUser.ILogin;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  const nowIso = toISOStringSafe(new Date());

  const normalizeEmail = (email: string): string => {
    // Basic normalization: trim and lowercase. Authentication requirements
    // mention normalization but do not specify further rules.
    return email.trim().toLowerCase();
  };

  const loginEmail = normalizeEmail(props.body.email);

  // Threshold for locking accounts based on consecutive failed login attempts.
  const MAX_FAILED_ATTEMPTS = 5;

  const admin = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      email: loginEmail,
    },
  });

  if (!admin) {
    await MyGlobal.prisma.todo_app_login_attempts.create({
      data: {
        id: v4(),
        login_identifier: loginEmail,
        actor_type: "adminUser",
        succeeded: false,
        ip:
          props.body.ip === null || props.body.ip === undefined
            ? ""
            : props.body.ip,
        user_agent:
          props.body.user_agent === null || props.body.user_agent === undefined
            ? null
            : props.body.user_agent,
        failure_reason: "invalid_credentials",
        created_at: nowIso,
        todo_app_memberuser_id: null,
        todo_app_adminuser_id: null,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // From here, `admin` is guaranteed to be non-null
  const nonNullAdmin = admin;

  const ipValue =
    props.body.ip === null || props.body.ip === undefined ? "" : props.body.ip;

  const userAgentValue =
    props.body.user_agent === null || props.body.user_agent === undefined
      ? null
      : props.body.user_agent;

  const createLoginAttempt = async (params: {
    adminId: string | null;
    succeeded: boolean;
    failureReason: string | null;
  }): Promise<void> => {
    await MyGlobal.prisma.todo_app_login_attempts.create({
      data: {
        id: v4(),
        login_identifier: loginEmail,
        actor_type: "adminUser",
        succeeded: params.succeeded,
        ip: ipValue,
        user_agent: userAgentValue,
        failure_reason: params.failureReason,
        created_at: nowIso,
        todo_app_memberuser_id: null,
        todo_app_adminuser_id: params.adminId,
      },
    });
  };

  const throwInvalidCredentials = async (
    adminId: string | null,
    failureReason: string | null,
  ): Promise<never> => {
    await createLoginAttempt({
      adminId,
      succeeded: false,
      failureReason,
    });
    throw new HttpException("Invalid credentials", 401);
  };

  if (nonNullAdmin.deleted_at !== null) {
    await throwInvalidCredentials(nonNullAdmin.id, "account_locked");
  }

  if (nonNullAdmin.status !== "active") {
    await throwInvalidCredentials(nonNullAdmin.id, "account_locked");
  }

  if (nonNullAdmin.failed_login_count >= MAX_FAILED_ATTEMPTS) {
    await throwInvalidCredentials(nonNullAdmin.id, "account_locked");
  }

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    nonNullAdmin.password_hash,
  );

  if (!passwordValid) {
    await MyGlobal.prisma.todo_app_adminusers.update({
      where: { id: nonNullAdmin.id },
      data: {
        failed_login_count: nonNullAdmin.failed_login_count + 1,
        updated_at: nowIso,
      },
    });

    await throwInvalidCredentials(nonNullAdmin.id, "invalid_credentials");
  }

  const accessExpiresAt = Date.now() + 60 * 60 * 1000;
  const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresAt));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresAt));

  const updatedAdmin = await MyGlobal.prisma.todo_app_adminusers.update({
    where: { id: nonNullAdmin.id },
    data: {
      failed_login_count: 0,
      last_login_at: nowIso,
      updated_at: nowIso,
    },
  });

  const sessionId = v4();

  await MyGlobal.prisma.todo_app_adminuser_sessions.create({
    data: {
      id: sessionId,
      todo_app_adminuser_id: updatedAdmin.id,
      ip: ipValue,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpiresIso,
    },
  });

  await createLoginAttempt({
    adminId: updatedAdmin.id,
    succeeded: true,
    failureReason: null,
  });

  const accessToken = jwt.sign(
    {
      type: "admin",
      id: updatedAdmin.id,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: updatedAdmin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  const authorized: ITodoAppAdminUser.IAuthorized = {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    display_name:
      updatedAdmin.display_name === null ? null : updatedAdmin.display_name,
    status: updatedAdmin.status,
    failed_login_count: updatedAdmin.failed_login_count,
    last_login_at:
      updatedAdmin.last_login_at === null
        ? null
        : toISOStringSafe(updatedAdmin.last_login_at),
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
    deleted_at:
      updatedAdmin.deleted_at === null
        ? null
        : toISOStringSafe(updatedAdmin.deleted_at),
    token,
  };

  return authorized;
}
