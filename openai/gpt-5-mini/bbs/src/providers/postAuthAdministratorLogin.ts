import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthAdministratorLogin(props: {
  body: IEconPoliticalForumAdministrator.ILogin;
}): Promise<IEconPoliticalForumAdministrator.IAuthorized> {
  const { body } = props;
  const { usernameOrEmail, password } = body;

  try {
    // Find active user by username or email
    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
        where: {
          deleted_at: null,
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      });

    if (!user || !user.password_hash) {
      throw new HttpException("Invalid credentials", 401);
    }

    // Check account lock
    const nowMs = Date.now();
    if (user.locked_until && user.locked_until.getTime() > nowMs) {
      throw new HttpException("Account locked", 403);
    }

    // Verify password
    const passwordValid = await PasswordUtil.verify(
      password,
      user.password_hash,
    );
    if (!passwordValid) {
      const failed = (user.failed_login_attempts ?? 0) + 1;
      const LOCKOUT_THRESHOLD = 5;
      const LOCKOUT_MINUTES = 15;

      const updatePayload: Record<string, unknown> = {
        failed_login_attempts: failed,
        updated_at: toISOStringSafe(new Date()),
      };

      if (failed >= LOCKOUT_THRESHOLD) {
        updatePayload.locked_until = toISOStringSafe(
          new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
        );
      }

      await MyGlobal.prisma.econ_political_forum_registereduser.update({
        where: { id: user.id },
        data: updatePayload,
      });

      throw new HttpException("Invalid credentials", 401);
    }

    // Successful authentication - reset counters and set last_login_at
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.econ_political_forum_registereduser.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: now,
        updated_at: now,
      },
    });

    // Check administrator relation
    const admin =
      await MyGlobal.prisma.econ_political_forum_administrator.findUnique({
        where: { registereduser_id: user.id },
      });

    // Issue tokens
    const accessToken = jwt.sign(
      { id: user.id, type: admin ? "administrator" : "registereduser" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      { id: user.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const refreshHash = await PasswordUtil.hash(refreshToken);

    // Create session record
    const sessionId = v4() as string & tags.Format<"uuid">;
    const sessionToken = v4();
    const expiresAt = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 3600 * 1000),
    );

    await MyGlobal.prisma.econ_political_forum_sessions.create({
      data: {
        id: sessionId,
        registereduser_id: user.id,
        session_token: sessionToken,
        refresh_token_hash: refreshHash,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      },
    });

    // Build safe user summary
    const userSummary: IEconPoliticalForumRegisteredUser.ISummary = {
      id: user.id,
      username: user.username,
      display_name: user.display_name ?? undefined,
      bio: user.bio ?? undefined,
      avatar_uri: user.avatar_uri ?? undefined,
      created_at: user.created_at
        ? toISOStringSafe(user.created_at)
        : undefined,
      updated_at: user.updated_at
        ? toISOStringSafe(user.updated_at)
        : undefined,
    };

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      refreshable_until: expiresAt,
    };

    return {
      id: user.id,
      token,
      user: userSummary,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
