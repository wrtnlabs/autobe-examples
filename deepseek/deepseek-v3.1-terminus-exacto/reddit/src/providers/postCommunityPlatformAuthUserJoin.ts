import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthUserJoin(props: {
  body: ICommunityPlatformUser.IJoin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // Validate input using typia
  typia.assert<ICommunityPlatformUser.IJoin>(props.body);
  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.community_platform_users.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.community_platform_users.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create user record with proper UUID and ISO strings
  const userId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const user = await MyGlobal.prisma.community_platform_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      karma: 0,
      email_verified: false,
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    ...CommunityPlatformUserTransformer.select(),
  });
  // Create session with proper UUID and ISO strings
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  // Generate JWT tokens first
  const accessToken = jwt.sign(
    {
      type: "user",
      id: userId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: userId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session with tokens
  const session = await MyGlobal.prisma.community_platform_user_sessions.create(
    {
      data: {
        id: sessionId,
        community_platform_user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        ip: "0.0.0.0", // Default IP - should be extracted from request context
        href: "/communityPlatform/auth/user/join", // Default href
        referrer: null,
        user_agent: "AutoBE-Registration", // Default user agent
        created_at: new Date(now),
        expired_at: new Date(accessExpires),
      },
    },
  );
  // Transform user data
  const userData = await CommunityPlatformUserTransformer.transform(user);
  // Fix undefined properties by converting them to null
  const safeUserData = {
    ...userData,
    display_name: userData.display_name ?? null,
    bio: userData.bio ?? null,
    avatar_url: userData.avatar_url ?? null,
  };
  // Return authorized response with proper token structure
  return {
    ...safeUserData,
    email: props.body.email,
    email_verified: false,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityPlatformUser.IAuthorized;
}
