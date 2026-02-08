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

export async function postCommunityPlatformAuthUserLogin(props: {
  body: ICommunityPlatformUser.ILogin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // Treat props.body as any to access email and password due to ILogin lacking explicit properties
  const body = props.body as any;
  // Find user by email, select needed fields including password_hash
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { email: body.email },
    select: {
      id: true,
      display_name: true,
      email: true,
      bio: true,
      avatar_url: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!user) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Prepare timestamps
  const nowIso = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create new session with correct foreign key field 'user_id'
  const session = await MyGlobal.prisma.community_platform_user_sessions.create(
    {
      data: {
        id: v4(),
        user_id: user.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: nowIso,
        expired_at: accessExpires,
      },
    },
  );
  // Generate JWT tokens
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    token,
  };
}
