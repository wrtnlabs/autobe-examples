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

export async function postDiscussionBoardAuthUserJoin(props: {
  body: IDiscussionBoardUser.IJoin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Get next citizen ID
  const maxCitizen =
    await MyGlobal.prisma.discussion_board_user_citizens.aggregate({
      _max: { citizen_id: true },
    });
  const nextCitizenId = (maxCitizen._max.citizen_id ?? 0) + 1;
  // 3. Create citizen record
  const citizen = await MyGlobal.prisma.discussion_board_user_citizens.create({
    data: {
      id: v4(),
      citizen_id: nextCitizenId,
      created_at: new Date(),
    },
  });
  // 4. Create user (password hashed via PasswordUtil)
  const user = await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: v4(),
      citizen_id: citizen.id,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.displayName,
      bio: null,
      permission_level: "MEMBER",
      is_banned: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 5. Create session first (needed for session_id in JWT)
  const now = Date.now();
  const accessExpires = new Date(now + 15 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: v4(),
      discussion_board_user_id: user.id,
      access_token: "", // placeholder, will update after JWT generation
      refresh_token: "", // placeholder
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: null,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 6. Generate JWT tokens with actual session_id
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with actual tokens
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 8. Return IAuthorized
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: user.id,
    displayName: user.display_name,
    bio: user.bio,
    memberSince: user.created_at.toISOString(),
    articleCount: 0,
    commentCount: 0,
    token,
    email: user.email,
    permission_level: user.permission_level,
  };
}
