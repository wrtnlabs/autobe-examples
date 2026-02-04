import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

export async function postCommunityPlatformAuthOwnerRefresh(props: {
  body: ICommunityPlatformOwner.IRefresh;
}): Promise<ICommunityPlatformOwner.IAuthorized> {
  // Decode and verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "owner";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "owner";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type - must be owner
  if (decoded.type !== "owner") {
    throw new HttpException("Invalid token type", 403);
  }
  // Verify session exists and is active
  const session =
    await MyGlobal.prisma.community_platform_owner_sessions.findFirst({
      where: {
        id: decoded.session_id,
        owner_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Generate new access token with short expiration (1 hour)
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const access = jwt.sign(
    {
      type: "owner",
      id: decoded.id as string & tags.Format<"uuid">,
      session_id: decoded.session_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Return authorized response with same refresh token (not renewed)
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh: props.body.refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
