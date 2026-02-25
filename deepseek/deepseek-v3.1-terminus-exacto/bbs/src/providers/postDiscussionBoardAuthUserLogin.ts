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

export async function postDiscussionBoardAuthUserLogin(props: {
  body: IDiscussionBoardUser.ILogin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // Find user by email with password_hash
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Ensure user is not deleted
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Generate expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  // Create JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session - IP and user_agent will come from actual implementation context
  await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: "127.0.0.1", // Default IP - would come from request context in real implementation
      user_agent: "unknown", // Default user agent
      referrer: null,
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
      last_accessed_at: now.toISOString(),
    },
  });
  // Return user data with tokens
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email,
    display_name: user.display_name,
    bio: user.bio,
    created_at: user.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: user.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: user.deleted_at
      ? (user.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
