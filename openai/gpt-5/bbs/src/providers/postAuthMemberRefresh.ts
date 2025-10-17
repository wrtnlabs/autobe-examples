import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberRefresh(props: {
  body: IEconDiscussMember.IRefresh;
}): Promise<IEconDiscussMember.IAuthorized> {
  const { body } = props;

  // 1) Verify and decode refresh token
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  if (typeof decoded === "string") {
    throw new HttpException("Unauthorized: Malformed token payload", 401);
  }
  const payload = decoded; // jwt.JwtPayload

  // tokenType should be 'refresh' if present
  const tokenType: unknown = payload["tokenType"];
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException("Unauthorized: Not a refresh token", 401);
  }

  // Extract user id from sub or id
  const userId: string | null =
    typeof payload.sub === "string"
      ? payload.sub
      : typeof payload["id"] === "string"
        ? (payload["id"] as string)
        : null;
  if (!userId) {
    throw new HttpException("Unauthorized: Missing subject", 401);
  }

  // Optional role type check
  const roleType = payload["type"];
  if (roleType !== undefined && roleType !== "member") {
    throw new HttpException("Forbidden: Role mismatch", 403);
  }

  // 2) Fetch active user and verify membership
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("Unauthorized: User not found", 401);
  }

  const membership = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: { user_id: user.id, deleted_at: null },
  });
  if (!membership) {
    throw new HttpException("Forbidden: Not a member", 403);
  }

  // 3) Revocation check via updated_at pivot (logoutAll should bump updated_at)
  const iatSeconds: number | undefined = payload.iat;
  if (typeof iatSeconds === "number") {
    const tokenIssuedAtMs = iatSeconds * 1000;
    const userUpdatedAtIso = toISOStringSafe(user.updated_at);
    const userUpdatedAtMs = Date.parse(userUpdatedAtIso);
    if (tokenIssuedAtMs < userUpdatedAtMs) {
      throw new HttpException("Unauthorized: Token revoked", 401);
    }
  }

  // 4) Mint new tokens (access + rotated refresh)
  const nowMs = Date.now();
  const accessExpMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessPayload = {
    id: user.id as string & tags.Format<"uuid">,
    type: "member" as const,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
    subject: user.id,
  });

  const refreshPayload = {
    id: user.id as string & tags.Format<"uuid">,
    type: "member" as const,
    tokenType: "refresh" as const,
  };
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
    subject: user.id,
  });

  const expired_at = toISOStringSafe(new Date(accessExpMs));
  const refreshable_until = toISOStringSafe(new Date(refreshExpMs));

  // 5) Build subject snapshot
  const subject: IEconDiscussMember.ISubject = {
    id: user.id as string & tags.Format<"uuid">,
    displayName: user.display_name,
    avatarUri:
      user.avatar_uri === null
        ? undefined
        : (user.avatar_uri as string & tags.MaxLength<80000>),
    timezone: user.timezone === null ? undefined : user.timezone,
    locale: user.locale === null ? undefined : user.locale,
    emailVerified: user.email_verified,
    mfaEnabled: user.mfa_enabled,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  };

  // 6) Return authorized session
  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
    member: subject,
  };
}
