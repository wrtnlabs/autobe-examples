import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ContentmoderatorPayload } from "../decorators/payload/ContentmoderatorPayload";

export async function postAuthContentModeratorRefresh(props: {
  contentModerator: ContentmoderatorPayload;
  body: IEconPoliticalDiscussionContentModerator.IRefresh;
}): Promise<IEconPoliticalDiscussionContentModerator.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "content_moderator";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "content_moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate token type matches expected
  if (decoded.type !== "content_moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session and get moderator data
  const moderator =
    await MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: {
        id: decoded.id,
        deleted_at: null, // Ensure moderator is not deleted
      },
    });

  if (!moderator) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Verify moderator status
  if (moderator.status !== "active") {
    throw new HttpException("Content moderator account is not active", 403);
  }

  // Step 5: Generate new access and refresh tokens with same session_id
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // Reuse existing session ID
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // Reuse existing session ID
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 6: Return structured response
  return {
    id: moderator.id,
    display_name: moderator.display_name,
    email: moderator.email,
    bio: moderator.bio,
    avatar_url: moderator.avatar_url,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: token,
  };
}
