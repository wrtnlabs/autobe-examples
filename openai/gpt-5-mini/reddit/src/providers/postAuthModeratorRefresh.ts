import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: ICommunityPortalModerator.IRefresh;
}): Promise<ICommunityPortalModerator.IAuthorized> {
  const { body } = props;

  // Verify and decode refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  // Extract user identifier from token payload
  const payload = decoded as Record<string, unknown>;
  const userId =
    (typeof payload.id === "string" && payload.id) ||
    (typeof payload.userId === "string" && payload.userId) ||
    (typeof payload.sub === "string" && payload.sub);

  if (!userId)
    throw new HttpException("Unauthorized: Invalid token payload", 401);

  // Fetch user
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });

  if (!user) throw new HttpException("Unauthorized: User not found", 401);

  // Deny refresh for deleted users
  if (user.deleted_at) {
    throw new HttpException("Unauthorized: User deleted", 401);
  }

  // Check membership suspension state (if membership record exists)
  const member = await MyGlobal.prisma.community_portal_members.findUnique({
    where: { user_id: user.id },
  });

  if (member && member.is_suspended) {
    throw new HttpException("Forbidden: Account suspended", 403);
  }

  // Prepare expiry timestamps
  const accessExpiresMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const expired_at = toISOStringSafe(new Date(Date.now() + accessExpiresMs));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshExpiresMs),
  );

  // Issue tokens
  const access = jwt.sign(
    { id: user.id, type: "moderator" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    { id: user.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Build and return authorized payload
  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? undefined,
    karma:
      (typeof user.karma === "number"
        ? (user.karma as number & tags.Type<"int32">)
        : undefined) ?? undefined,
    avatar_uri: user.avatar_uri ?? undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
