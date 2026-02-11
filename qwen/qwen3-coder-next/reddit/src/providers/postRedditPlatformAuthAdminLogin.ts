import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformAdminTransformer } from "../transformers/RedditPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthAdminLogin(props: {
  body: IRedditPlatformAdmin.ILogin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...RedditPlatformAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      access_token: v4(), // Use token value as identifier
      refresh_token: v4(),
      ip: "",
      href: "",
      created_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
      is_revoked: false,
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    ...(await RedditPlatformAdminTransformer.transform(admin)),
    token,
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
