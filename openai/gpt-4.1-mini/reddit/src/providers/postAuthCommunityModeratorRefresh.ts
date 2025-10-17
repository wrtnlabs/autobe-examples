import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityModeratorRefresh(props: {
  body: IRedditCommunityCommunityModerator.IRefresh;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid token payload", 401);
  }

  const decodedObj = decoded as Record<string, unknown>;
  const userIdRaw = decodedObj["id"] ?? decodedObj["userId"];
  if (typeof userIdRaw !== "string") {
    throw new HttpException("Invalid token payload: user id missing", 401);
  }

  const user = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: userIdRaw },
  });

  if (!user) {
    throw new HttpException("User not found", 401);
  }

  const payload = {
    id: user.id,
    email: user.email,
    type: "communitymoderator",
  };

  const now = Date.now();

  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "communitymoderator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: new Date(now + 3600 * 1000).toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: new Date(
        now + 7 * 24 * 3600 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
  };
}
