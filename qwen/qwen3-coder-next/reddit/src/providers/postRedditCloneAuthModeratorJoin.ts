import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthModeratorJoin(props: {
  body: IRedditCloneModerator.IJoin;
}): Promise<IRedditCloneModerator.IAuthorized> {
  // 1. Validate email format and check duplicate
  const existingByEmail =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existingByEmail) throw new HttpException("Email already registered", 409);
  // 2. Validate username format and check duplicate
  const existingByUsername =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: { username: props.body.username },
    });
  if (existingByUsername)
    throw new HttpException("Username already registered", 409);
  // 3. Create moderator record with bcrypt hashed password
  const now = toISOStringSafe(new Date());
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName ?? null,
      role_type: "moderator",
      permissions: 0,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      role_type: true,
      permissions: true,
      created_at: true,
    },
  });
  // 4. Generate JWT tokens
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: v4() as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized response
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string & tags.Format<"email">,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: null,
    avatar_url: null,
    role_type: moderator.role_type,
    permissions: moderator.permissions,
    created_at: toISOStringSafe(moderator.created_at),
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_in: 900,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  } satisfies IRedditCloneModerator.IAuthorized;
}
