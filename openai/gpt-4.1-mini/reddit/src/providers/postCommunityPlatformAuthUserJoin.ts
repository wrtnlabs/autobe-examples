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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthUserJoin(props: {
  body: ICommunityPlatformUser.IJoin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // 1. Check uniqueness of email and username
  const existingUser = await MyGlobal.prisma.community_platform_users.findFirst(
    {
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
    },
  );
  if (existingUser) {
    if (existingUser.email === props.body.email) {
      throw new HttpException("Email already registered", 409);
    }
    if (existingUser.username === props.body.username) {
      throw new HttpException("Username already taken", 409);
    }
  }
  // 2. Create user record (manual mapping, password assumed hashed outside)
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  const user = await MyGlobal.prisma.community_platform_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: props.body.password, // assuming hashing done externally
      username: props.body.username,
      display_name: props.body.displayName,
      bio: null,
      avatar_url: null,
      karma: 0,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
  });
  // 3. Create session record manually
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 3600 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const session = await MyGlobal.prisma.community_platform_user_sessions.create(
    {
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        ip: props.body.ip ?? "", // provide empty string fallback to satisfy string type
        created_at: now.toISOString(),
        expired_at: accessExpires.toISOString(),
        refresh_expires_at: refreshExpires.toISOString(),
        updated_at: now.toISOString(),
        deleted_at: null,
      },
    },
  );
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized with manual transformation and typia assertion
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    bio: null,
    avatar_url: null,
    karma: user.karma satisfies number & tags.Type<"int32"> as number &
      tags.Type<"int32">,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null as null,
    token,
  } satisfies ICommunityPlatformUser.IAuthorized;
}
