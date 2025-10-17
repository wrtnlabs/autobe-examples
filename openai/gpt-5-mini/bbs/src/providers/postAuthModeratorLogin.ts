import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IEconPoliticalForumModerator.ILogin;
}): Promise<IEconPoliticalForumModerator.IAuthorized> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
      where: {
        OR: [
          { username: body.usernameOrEmail },
          { email: body.usernameOrEmail },
        ],
        deleted_at: null,
      },
    });

  if (!user) throw new HttpException("Invalid credentials", 401);

  if (
    user.locked_until &&
    user.locked_until instanceof Date &&
    user.locked_until > new Date()
  ) {
    throw new HttpException("Account locked", 403);
  }

  const passwordMatches = user.password_hash
    ? await PasswordUtil.verify(body.password, user.password_hash)
    : false;

  if (!passwordMatches) {
    const THRESHOLD = 5;
    const LOCK_DURATION_MS = 15 * 60 * 1000;

    const failedCount = (user.failed_login_attempts ?? 0) + 1;
    const lockedUntilValue =
      failedCount >= THRESHOLD
        ? toISOStringSafe(new Date(Date.now() + LOCK_DURATION_MS))
        : null;

    await MyGlobal.prisma.econ_political_forum_registereduser.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: failedCount,
        locked_until: lockedUntilValue,
        updated_at: now,
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  const access = jwt.sign(
    { id: user.id, email: user.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const refreshHash = await PasswordUtil.hash(refresh);

  const sessionId = v4() as string & tags.Format<"uuid">;
  const sessionToken = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_sessions.create({
      data: {
        id: sessionId,
        registereduser_id: user.id,
        session_token: sessionToken,
        refresh_token_hash: refreshHash,
        ip_address: null,
        user_agent: null,
        last_active_at: now,
        expires_at: refreshableUntil,
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.econ_political_forum_registereduser.update({
      where: { id: user.id },
      data: {
        last_login_at: now,
        failed_login_attempts: 0,
        updated_at: now,
      },
    }),
  ]);

  await MyGlobal.prisma.econ_political_forum_moderator.findUnique({
    where: { registereduser_id: user.id },
  });

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt as string & tags.Format<"date-time">,
      refreshable_until: refreshableUntil as string & tags.Format<"date-time">,
    },
  };
}
