import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IEconomicDiscussionModerator.IRefresh;
}): Promise<IEconomicDiscussionModerator.IAuthorized> {
  // Step 1: Decode and verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate token type matches expected actor
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        economic_discussion_moderator_id: decoded.id,
      },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Check moderator account status
  if (!session.moderator) {
    throw new HttpException("Moderator account not found", 404);
  }

  // Step 5: Generate new tokens with same session_id for continuity
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id, // Reuse same session for continuity
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id, // Reuse same session for continuity
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update session expiration
  await MyGlobal.prisma.economic_discussion_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Step 7: Return complete moderator profile with new tokens
  const moderator = session.moderator;
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    email: moderator.email as string & tags.Format<"email">,
    email_verified: moderator.email_verified,
    two_factor_enabled: moderator.two_factor_enabled,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires as string & tags.Format<"date-time">,
      refreshable_until: refreshExpires as string & tags.Format<"date-time">,
    },
  };
}
