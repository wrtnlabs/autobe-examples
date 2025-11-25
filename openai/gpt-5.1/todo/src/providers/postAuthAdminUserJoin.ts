import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserJoin(props: {
  body: ITodoAppAdminUser.IJoin;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  const { body } = props;

  // 1. Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      email: body.email,
    },
  });

  if (existingAdmin) {
    throw new HttpException("Admin email already registered", 409);
  }

  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(body.password);

  // 3. Compute current timestamp and token expiry timestamps as ISO strings
  const now = toISOStringSafe(new Date());

  const accessExpiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiredAt = toISOStringSafe(accessExpiryDate);
  const refreshableUntil = toISOStringSafe(refreshExpiryDate);

  // 4. Create admin user and session within a single transaction callback
  const { adminUser, adminSession } = await MyGlobal.prisma.$transaction(
    async (tx) => {
      const createdAdminUser = await tx.todo_app_adminusers.create({
        data: {
          id: v4(),
          email: body.email,
          password_hash: passwordHash,
          display_name:
            body.display_name === undefined ? undefined : body.display_name,
          status: body.status,
          created_at: now,
          updated_at: now,
        },
      });

      const createdAdminSession = await tx.todo_app_adminuser_sessions.create({
        data: {
          id: v4(),
          todo_app_adminuser_id: createdAdminUser.id,
          ip: body.ip,
          href: body.href,
          referrer: body.referrer,
          created_at: now,
          expired_at: null,
        },
      });

      return {
        adminUser: createdAdminUser,
        adminSession: createdAdminSession,
      };
    },
  );

  // 5. Generate JWT tokens for the newly created admin user and session
  const tokenCreatedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      type: "adminUser",
      id: adminUser.id,
      session_id: adminSession.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "adminUser",
      id: adminUser.id,
      session_id: adminSession.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
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
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };

  // 6. Build response conforming to ITodoAppAdminUser.IAuthorized
  return {
    id: adminUser.id,
    email: adminUser.email,
    display_name:
      adminUser.display_name === undefined ? undefined : adminUser.display_name,
    status: adminUser.status,
    created_at: toISOStringSafe(adminUser.created_at),
    updated_at: toISOStringSafe(adminUser.updated_at),
    token,
  };
}
