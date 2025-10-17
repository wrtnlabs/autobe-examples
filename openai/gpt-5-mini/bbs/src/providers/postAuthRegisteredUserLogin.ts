import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthRegisteredUserLogin(props: {
  body: IEconPoliticalForumRegisteredUser.ILogin;
}): Promise<IEconPoliticalForumRegisteredUser.IAuthorized> {
  const { body } = props;

  // Use sensible defaults for lockout thresholds (avoid referencing unknown env keys)
  const maxFailed = 5;
  const lockMinutes = 15;

  // Find user by username OR email
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
      where: {
        OR: [
          { username: body.usernameOrEmail },
          { email: body.usernameOrEmail },
        ],
      },
    });

  // Generic failure to avoid user enumeration
  if (!user || !user.password_hash) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Current time ISO
  const nowIso = toISOStringSafe(new Date());

  // Check lockout
  if (user.locked_until) {
    const lockedUntilIso = toISOStringSafe(user.locked_until);
    if (lockedUntilIso > nowIso) {
      throw new HttpException("Invalid credentials", 401);
    }
  }

  // Verify password
  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) {
    const nextFailed = (user.failed_login_attempts ?? 0) + 1;

    if (nextFailed >= maxFailed) {
      const lockUntil = toISOStringSafe(
        new Date(Date.now() + lockMinutes * 60000),
      );
      await MyGlobal.prisma.econ_political_forum_registereduser.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: nextFailed,
          locked_until: lockUntil,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else {
      await MyGlobal.prisma.econ_political_forum_registereduser.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: nextFailed,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }

    throw new HttpException("Invalid credentials", 401);
  }

  // Successful authentication: issue tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, type: "registereduser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const accessExpiryIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiryIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const refreshHash = await PasswordUtil.hash(refreshToken);

  // Create session record
  await MyGlobal.prisma.econ_political_forum_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: user.id,
      session_token: v4() as string & tags.Format<"uuid">,
      refresh_token_hash: refreshHash,
      ip_address: null,
      user_agent: null,
      last_active_at: nowIso,
      expires_at: refreshExpiryIso,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  // Update user last login and reset failed attempts
  await MyGlobal.prisma.econ_political_forum_registereduser.update({
    where: { id: user.id },
    data: {
      last_login_at: nowIso,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: nowIso,
    },
  });

  // Prepare returned timestamps
  const createdAtIso = user.created_at
    ? toISOStringSafe(user.created_at)
    : undefined;
  const updatedAtIso = user.updated_at
    ? toISOStringSafe(user.updated_at)
    : undefined;

  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryIso,
      refreshable_until: refreshExpiryIso,
    },
    username: user.username ?? undefined,
    display_name: user.display_name ?? null,
    avatar_uri: user.avatar_uri ?? null,
    email_verified: user.email_verified ?? undefined,
    created_at: createdAtIso,
    updated_at: updatedAtIso,
  };
}
