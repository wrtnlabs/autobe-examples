import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserLogin(props: {
  body: ICommunityPlatformAdminUserLogin.ICreate;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { body } = props;

  const user =
    "email" in body
      ? await MyGlobal.prisma.community_platform_users.findFirst({
          where: {
            email: body.email,
            deleted_at: null,
          },
        })
      : await MyGlobal.prisma.community_platform_users.findFirst({
          where: {
            username: body.username,
            deleted_at: null,
          },
        });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordOk = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );
  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  const blockedStates = new Set([
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ]);
  if (blockedStates.has(user.account_state)) {
    throw new HttpException("Account is not eligible for login", 403);
  }
  if (!user.email_verified) {
    throw new HttpException("Email is not verified", 403);
  }

  const activeAdmin =
    await MyGlobal.prisma.community_platform_admin_users.findFirst({
      where: {
        community_platform_user_id: user.id,
        revoked_at: null,
        deleted_at: null,
      },
    });
  if (!activeAdmin) {
    throw new HttpException("Administrator privileges required", 403);
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      id: user.id,
      type: "adminuser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: user.id,
      type: "adminuser",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExp,
    refreshable_until: refreshExp,
  };

  return {
    id: user.id as string & tags.Format<"uuid">,
    token,
    role: "adminUser",
  };
}
