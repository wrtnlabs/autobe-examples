import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: ICommunityPortalAdmin.IRefresh;
}): Promise<ICommunityPortalAdmin.IAuthorized> {
  const { body } = props;

  // Verify refresh token
  let verified: unknown;
  try {
    verified = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_err) {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  // Extract user id from token payload (support common claim names)
  const payload = verified as { id?: string; userId?: string; sub?: string };
  const userId = payload.id ?? payload.userId ?? payload.sub;
  if (!userId)
    throw new HttpException("Unauthorized: Invalid token payload", 401);

  // Load user and validate existence and deletion state
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Unauthorized: User not found", 401);
  if (user.deleted_at)
    throw new HttpException("Unauthorized: User removed", 401);

  // Ensure admin record exists and is active
  const adminRecord = await MyGlobal.prisma.community_portal_admins.findUnique({
    where: { user_id: user.id },
  });
  if (!adminRecord || !adminRecord.is_active) {
    throw new HttpException("Unauthorized: Admin privileges revoked", 401);
  }

  // Optionally include member_since if member record exists
  const member = await MyGlobal.prisma.community_portal_members.findUnique({
    where: { user_id: user.id },
  });

  // Issue new tokens (rotate refresh)
  const accessExpiresIn = "1h";
  const refreshExpiresIn = "7d";

  const accessToken = jwt.sign(
    { id: user.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExpiresIn,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh", role: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiresIn,
      issuer: "autobe",
    },
  );

  // Compute ISO timestamps for expirations
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Build admin summary (ICommunityPortalAdmin.ISummary)
  const adminSummary = {
    id: user.id,
    username: user.username,
    // ISummary.display_name is optional -- return undefined when absent
    display_name: user.display_name ?? undefined,
    karma: user.karma,
    member_since: member ? toISOStringSafe(member.member_since) : undefined,
  } satisfies ICommunityPortalAdmin.ISummary;

  // Build user summary (ICommunityPortalUser.ISummary)
  const userSummary = {
    id: user.id,
    username: user.username,
    // nullable fields should be null when absent (per DTO definition)
    display_name: user.display_name ?? null,
    bio: user.bio ?? null,
    avatar_uri: user.avatar_uri ?? null,
    karma: user.karma,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  } satisfies ICommunityPortalUser.ISummary;

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at,
    refreshable_until,
  } satisfies IAuthorizationToken;

  return {
    id: user.id,
    admin: adminSummary,
    user: userSummary,
    token,
  } satisfies ICommunityPortalAdmin.IAuthorized;
}
