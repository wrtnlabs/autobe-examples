import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ICommunityPlatformUser.ILogin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // Step 1: Find active, non-deleted user by email
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
      status: "active",
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Step 2: Password verification
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Step 3: Create new session
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const ip =
    props.body.ip == null ? "" : (props.body.ip satisfies string as string);
  await MyGlobal.prisma.community_platform_user_sessions.create({
    data: {
      id: sessionId,
      community_platform_user_id: user.id,
      ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpire,
    },
  });
  // Step 4: JWT token generation
  const token = {
    access: jwt.sign(
      {
        id: user.id,
        session_id: sessionId,
        type: "user",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        id: user.id,
        session_id: sessionId,
        type: "user",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    business_status:
      typeof user.business_status === "undefined"
        ? undefined
        : user.business_status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      typeof user.deleted_at === "undefined"
        ? undefined
        : user.deleted_at === null
          ? null
          : toISOStringSafe(user.deleted_at),
    token,
  };
}
