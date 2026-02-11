import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthPlatformadminJoin(props: {
  body: IRedditCommunityPlatformAdmin.IJoin;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existingAdmin =
    await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existingAdmin) throw new HttpException("Email already registered", 409);
  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existingMember) throw new HttpException("Email already registered", 409);
  // 2. Create actor with required fields from schema: id, display_name, karma
  const admin = await MyGlobal.prisma.reddit_community_platform_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.email.split("@")[0], // Default from email
      karma: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Create session with required fields: ip, href, referrer
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_platform_admin_sessions.create({
      data: {
        id: v4(),
        platform_admin_id: admin.id,
        ip: "127.0.0.1", // Default IP
        href: "https://example.com/login", // Default href
        referrer: "", // Default referrer
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  // 4. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "platformadmin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "platformadmin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized with top-level properties matching IAuthorizationToken
  return {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
  } satisfies IRedditCommunityPlatformAdmin.IAuthorized;
}
