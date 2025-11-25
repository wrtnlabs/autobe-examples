import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postAuthAdministratorRefresh(props: {
  administrator: AdministratorPayload;
  body: ICommunityForumCommunityAdministrator.IRefresh;
}): Promise<ICommunityForumCommunityAdministrator.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "administrator";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "administrator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate type matches expected actor type
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3. Validate the session still exists and is active
  const session =
    await MyGlobal.prisma.community_forum_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_forum_administrator_id: decoded.id,
      },
      include: {
        administrator: {
          include: {
            user: true,
          },
        },
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Check if the session has expired
  if (session.expired_at && new Date(session.expired_at) < new Date()) {
    throw new HttpException("Session has expired", 401);
  }

  // 4. Generate new access and refresh tokens with the same session ID
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 5. Update session expiration time
  await MyGlobal.prisma.community_forum_administrator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // 6. Return new authorization tokens
  return {
    id: session.administrator.id,
    community_forum_user_id: session.administrator.community_forum_user_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
