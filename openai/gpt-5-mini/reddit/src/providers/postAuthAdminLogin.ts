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

export async function postAuthAdminLogin(props: {
  body: ICommunityPortalAdmin.ILogin;
}): Promise<ICommunityPortalAdmin.IAuthorized> {
  const { body } = props;
  const { identifier, password } = body;

  // Find user by email or username, exclude deleted users
  const user = await MyGlobal.prisma.community_portal_users.findFirst({
    where: {
      deleted_at: null,
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user) throw new HttpException("Invalid credentials", 401);

  // Verify password
  const verified = await PasswordUtil.verify(body.password, user.password_hash);
  if (!verified) throw new HttpException("Invalid credentials", 401);

  // Check membership suspension if member record exists
  const member = await MyGlobal.prisma.community_portal_members.findFirst({
    where: { user_id: user.id },
  });
  if (member && member.is_suspended) {
    throw new HttpException("Unauthorized: account suspended", 403);
  }

  // Check admin metadata
  const admin = await MyGlobal.prisma.community_portal_admins.findFirst({
    where: { user_id: user.id },
  });
  if (!admin || !admin.is_active) {
    throw new HttpException("Unauthorized: admin access not allowed", 403);
  }

  // Token expirations
  const accessTtlMs = 60 * 60 * 1000; // 1 hour
  const refreshTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + accessTtlMs));
  const refreshableUntil = toISOStringSafe(new Date(Date.now() + refreshTtlMs));

  // JWT payloads
  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "admin",
      admin_level: admin.admin_level,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Build response objects according to DTO nullability rules
  const adminSummary: ICommunityPortalAdmin.ISummary = {
    id: admin.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? undefined,
    karma: user.karma as number & tags.Type<"int32">,
    member_since:
      member && member.member_since
        ? toISOStringSafe(member.member_since)
        : undefined,
  };

  const userSummary: ICommunityPortalUser.ISummary = {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? null,
    bio: user.bio ?? null,
    avatar_uri: user.avatar_uri ?? null,
    karma: user.karma as number & tags.Type<"int32">,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt as string & tags.Format<"date-time">,
    refreshable_until: refreshableUntil as string & tags.Format<"date-time">,
  };

  return {
    id: user.id as string & tags.Format<"uuid">,
    admin: adminSummary,
    user: userSummary,
    token,
  };
}
