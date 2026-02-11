import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthPlatformadminRefresh(props: {
  body: IRedditCommunityPlatformAdmin.IRefresh;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "platformadmin";
    created_at: string & tags.Format<"date-time">;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any;
    if (
      typeof verified.id !== "string" ||
      typeof verified.session_id !== "string" ||
      typeof verified.type !== "string" ||
      typeof verified.created_at !== "string"
    ) {
      throw new Error("Invalid token payload");
    }
    decoded = {
      id: verified.id as string & tags.Format<"uuid">,
      session_id: verified.session_id as string & tags.Format<"uuid">,
      type: verified.type as "platformadmin",
      created_at: verified.created_at as string & tags.Format<"date-time">,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate actor type
  if (decoded.type !== "platformadmin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate platform admin exists and not deleted
  const platformAdmin =
    await MyGlobal.prisma.reddit_community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (platformAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Validate refresh token not revoked
  // Use findFirst instead of findUnique to search by jwt_token
  const revokedToken =
    await MyGlobal.prisma.reddit_community_token_revocations.findFirst({
      where: { jwt_token: props.body.refresh_token },
    });
  if (revokedToken) {
    throw new HttpException("Refresh token has been revoked", 401);
  }
  // 5. Mark incoming refresh token as revoked
  await MyGlobal.prisma.reddit_community_token_revocations.create({
    data: {
      id: v4(),
      jwt_token: props.body.refresh_token,
      actor_type: "platformadmin",
      revoked_at: toISOStringSafe(new Date()),
      expires_at: decoded.created_at,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 6. Generate new access and refresh tokens (same session_id)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "platformadmin",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "platformadmin",
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create new session record with actual IP metadata if available in request context
  // Note: In actual implementation, extract ip, href, referrer from request object
  await MyGlobal.prisma.reddit_community_platform_admin_sessions.create({
    data: {
      id: v4(),
      platform_admin_id: decoded.id,
      ip: "unknown",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(refreshExpires),
    },
  });
  // 8. Return new authorized tokens matching IAuthorized structure exactly
  return {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(accessExpires),
    },
  };
}
