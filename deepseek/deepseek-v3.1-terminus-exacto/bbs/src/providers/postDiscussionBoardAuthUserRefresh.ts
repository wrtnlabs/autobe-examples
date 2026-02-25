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
  // 1. Verify refresh token signature
  let decodedPayload: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  };
  try {
    decodedPayload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decodedPayload;
  } catch (error) {
    throw new HttpException("Invalid refresh token signature", 401);
  }
  // 2. Validate token type and structure
  if (
    decodedPayload.type !== "user" ||
    decodedPayload.tokenType !== "refresh"
  ) {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find active session by refresh token
  const currentTime = toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        expired_at: { gt: currentTime },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or invalid", 401);
  }
  // 4. Validate user account
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: session.discussion_board_user_id },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 403);
  }
  // 5. Generate new token timestamps
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 6. Generate new tokens using JWT
  const newAccessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: toISOStringSafe(refreshExpiresAt),
      last_accessed_at: toISOStringSafe(now),
    },
  });
  // 8. Return authorized user response
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    display_name: user.display_name,
    bio: user.bio,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(user.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      user.deleted_at !== null
        ? (toISOStringSafe(user.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpiresAt) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpiresAt) as string &
        tags.Format<"date-time">,
    },
  };
}
