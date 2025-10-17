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

export async function postAuthRegisteredUserJoin(props: {
  body: IEconPoliticalForumRegisteredUser.IJoin;
}): Promise<IEconPoliticalForumRegisteredUser.IAuthorized> {
  const { body } = props;

  try {
    // Pre-check uniqueness to provide friendly 409 errors
    const [existingByEmail, existingByUsername] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
        where: { email: body.email },
      }),
      MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
        where: { username: body.username },
      }),
    ]);

    if (existingByEmail)
      throw new HttpException("Conflict: email already in use", 409);
    if (existingByUsername)
      throw new HttpException("Conflict: username already in use", 409);

    // Prepare canonical timestamps and ids
    const nowIso = toISOStringSafe(new Date());
    const accessExpiryIso = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    ); // 1 hour
    const refreshExpiryIso = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ); // 7 days

    const newUserId = v4() as string & tags.Format<"uuid">;
    const newSessionId = v4() as string & tags.Format<"uuid">;
    const sessionToken = v4();

    // Hash password using provided utility
    const passwordHash = await PasswordUtil.hash(body.password);

    // Create the registered user record
    const created =
      await MyGlobal.prisma.econ_political_forum_registereduser.create({
        data: {
          id: newUserId,
          username: body.username,
          email: body.email,
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
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        },
      });

    // Generate JWTs
    const accessToken = jwt.sign(
      { userId: created.id, email: created.email },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      { userId: created.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    // Hash refresh token and create session
    const refreshTokenHash = await PasswordUtil.hash(refreshToken);

    await MyGlobal.prisma.econ_political_forum_sessions.create({
      data: {
        id: newSessionId,
        registereduser_id: created.id,
        session_token: sessionToken,
        refresh_token_hash: refreshTokenHash,
        ip_address: null,
        user_agent: null,
        last_active_at: null,
        expires_at: refreshExpiryIso,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryIso,
      refreshable_until: refreshExpiryIso,
    };

    // Build response matching IAuthorized - use explicit null/undefined per DTO
    return {
      id: created.id,
      token,
      username: created.username ?? undefined,
      display_name: created.display_name ?? null,
      avatar_uri: created.avatar_uri ?? null,
      email_verified: created.email_verified,
      created_at: nowIso,
      updated_at: nowIso,
    };
  } catch (err) {
    // Handle Prisma unique constraint race if it occurs despite pre-checks
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Determine which field caused the unique violation if possible
      const meta = (err.meta as { target?: string[] } | undefined) ?? undefined;
      if (meta && Array.isArray(meta.target) && meta.target.includes("email")) {
        throw new HttpException("Conflict: email already in use", 409);
      }
      if (
        meta &&
        Array.isArray(meta.target) &&
        meta.target.includes("username")
      ) {
        throw new HttpException("Conflict: username already in use", 409);
      }
      throw new HttpException("Conflict: duplicate value", 409);
    }

    if (err instanceof HttpException) throw err;

    // Unknown error
    throw new HttpException("Internal Server Error", 500);
  }
}
