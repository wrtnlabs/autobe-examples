import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthRefresh";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: IAuthRefresh;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  let decodedRefreshToken;

  try {
    decodedRefreshToken = jwt.verify(
      body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (typeof decodedRefreshToken !== "object" || decodedRefreshToken === null) {
    throw new HttpException("Invalid token payload", 401);
  }

  if (
    decodedRefreshToken.type !== "moderator" ||
    decodedRefreshToken.tokenType !== "refresh" ||
    typeof decodedRefreshToken.id !== "string"
  ) {
    throw new HttpException("Invalid token structure", 401);
  }

  const moderatorId = decodedRefreshToken.id as string & tags.Format<"uuid">;

  const foundModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        id: moderatorId,
        deleted_at: null,
      },
    });

  if (foundModerator === null) {
    throw new HttpException("Moderator not found or revoked", 403);
  }

  const tokenLifetimeSec = 3600; // 1 hour
  const refreshLifetimeSec = 7 * 24 * 3600; // 7 days

  const now = Date.now();

  // Build token payload
  const accessTokenPayload = {
    id: foundModerator.id,
    email: foundModerator.email,
    display_name: foundModerator.display_name,
    created_at: toISOStringSafe(foundModerator.created_at),
    updated_at: toISOStringSafe(foundModerator.updated_at),
    deleted_at:
      foundModerator.deleted_at !== null
        ? toISOStringSafe(foundModerator.deleted_at)
        : null,
    type: "moderator",
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: tokenLifetimeSec,
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: foundModerator.id,
    type: "moderator",
    tokenType: "refresh",
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshLifetimeSec,
      issuer: "autobe",
    },
  );

  const result: IDiscussionBoardModerator.IAuthorized = {
    id: foundModerator.id,
    email: foundModerator.email,
    display_name: foundModerator.display_name,
    created_at: toISOStringSafe(foundModerator.created_at),
    updated_at: toISOStringSafe(foundModerator.updated_at),
    deleted_at:
      foundModerator.deleted_at !== null
        ? toISOStringSafe(foundModerator.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(now + tokenLifetimeSec * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(now + refreshLifetimeSec * 1000),
      ),
    },
  };

  return result;
}
