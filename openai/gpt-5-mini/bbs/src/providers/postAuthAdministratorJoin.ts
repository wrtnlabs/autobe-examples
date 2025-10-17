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

export async function postAuthAdministratorJoin(props: {
  body: IEconPoliticalForumAdministrator.IJoin;
}): Promise<IEconPoliticalForumAdministrator.IAuthorized> {
  const { body } = props;
  const { email, password } = body;

  if (!email || !password) {
    throw new HttpException("Bad Request: missing email or password", 400);
  }

  // Check email uniqueness
  const existingByEmail =
    await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
      where: { email },
    });
  if (existingByEmail)
    throw new HttpException("Conflict: Email already registered", 409);

  // Prepare username (Prisma requires username non-nullable)
  let finalUsername: string;
  if (body.username !== undefined && body.username !== null) {
    finalUsername = body.username;
    const existingByUsername =
      await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
        where: { username: finalUsername },
      });
    if (existingByUsername)
      throw new HttpException("Conflict: Username already in use", 409);
  } else {
    const local = (email.split("@")[0] || "user").replace(
      /[^a-zA-Z0-9_\-]/g,
      "",
    );
    let candidate = local.substring(0, 30) || `user`;
    let attempt = 0;
    while (true) {
      const exists =
        await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
          where: { username: candidate },
        });
      if (!exists) break;
      attempt += 1;
      candidate =
        `${local.substring(0, 24)}${Date.now().toString().slice(-4)}${attempt}`.substring(
          0,
          30,
        );
      if (attempt > 5) break; // fallback after limited retries
    }
    finalUsername = candidate;
  }

  const passwordHash = await PasswordUtil.hash(password);

  const now = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const newUserId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.econ_political_forum_registereduser.create({
      data: {
        id: newUserId,
        email,
        username: finalUsername,
        password_hash: passwordHash,
        display_name: body.display_name ?? null,
        bio: null,
        avatar_uri: null,
        is_banned: false,
        banned_until: null,
        email_verified: false,
        verified_at: null,
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const accessToken = jwt.sign(
    { id: created.id, type: "registereduser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const sessionId = v4() as string & tags.Format<"uuid">;
  const refreshHash = await PasswordUtil.hash(refreshToken);

  await MyGlobal.prisma.econ_political_forum_sessions.create({
    data: {
      id: sessionId,
      registereduser_id: created.id,
      session_token: accessToken,
      refresh_token_hash: refreshHash,
      ip_address: null,
      user_agent: null,
      last_active_at: null,
      expires_at: refreshExpiresAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: created.id,
      moderator_id: null,
      post_id: null,
      thread_id: null,
      report_id: null,
      moderation_case_id: null,
      action_type: "create",
      target_type: "user",
      target_identifier: created.id,
      details: "Administrator account created",
      created_at: now,
      created_by_system: false,
    },
  });

  const userSummary: IEconPoliticalForumRegisteredUser.ISummary = {
    id: created.id,
    username: created.username,
    display_name: created.display_name ?? undefined,
    bio: created.bio ?? undefined,
    avatar_uri: created.avatar_uri ?? undefined,
    created_at: created.created_at
      ? toISOStringSafe(created.created_at)
      : undefined,
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
  };

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiresAt,
  };

  return {
    id: created.id,
    token,
    user: userSummary,
  };
}
