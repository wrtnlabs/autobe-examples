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
import { DiscussionBoardUserTransformer } from "../transformers/DiscussionBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthUserLogin(props: {
  body: IDiscussionBoardUser.ILogin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // Find user by email with password_hash explicitly selected
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
    select: {
      ...DiscussionBoardUserTransformer.select().select,
      password_hash: true,
    },
  });
  if (!user) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create new session with current timestamp
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: v4(),
      discussion_board_user_id: user.id,
      access_token: "", // Will be set after JWT generation
      refresh_token: "", // Will be set after JWT generation
      ip: "unknown", // Default value since IP not available in props
      user_agent: "unknown", // Default value since user agent not available in props
      referrer: null,
      created_at: now,
      expired_at: accessExpires,
      last_accessed_at: now,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with generated tokens
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // Return authorized user response
  return {
    ...(await DiscussionBoardUserTransformer.transform(user)),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
