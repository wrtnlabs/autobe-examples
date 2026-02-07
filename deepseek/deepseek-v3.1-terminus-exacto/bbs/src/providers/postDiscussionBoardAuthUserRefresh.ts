import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthUserRefresh(props: {
  body: IDiscussionBoardUser.IRefresh;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
    created_at?: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type and structure
  if (
    decoded.tokenType !== "refresh" ||
    decoded.type !== "user" ||
    !decoded.id ||
    !decoded.session_id
  ) {
    throw new HttpException("Invalid token structure", 403);
  }
  // Get current time as ISO string for comparison
  const now = toISOStringSafe(new Date());
  // Validate session
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_user_id: decoded.id,
        refresh_token: props.body.refresh_token,
        expired_at: { gt: now },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate user
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: decoded.id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with new refresh token and expiration
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
      last_accessed_at: new Date(),
    },
  });
  // Return authorized user data
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    display_name: user.display_name,
    bio: user.bio,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(user.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: user.deleted_at
      ? (toISOStringSafe(user.deleted_at) as string & tags.Format<"date-time">)
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  };
}
