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

export async function postRedditCommunityAuthPlatformadminLogin(props: {
  body: IRedditCommunityPlatformAdmin.ILogin;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  const admin =
    await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        password_hash: true,
      },
    });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_platform_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        platform_admin_id: admin.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  await MyGlobal.prisma.reddit_community_user_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_members_id: admin.id,
      action: "login",
      ip_address: "",
      user_agent: "",
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "platformadmin",
        id: admin.id as string & tags.Format<"uuid">,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "platformadmin",
        id: admin.id as string & tags.Format<"uuid">,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  } satisfies IRedditCommunityPlatformAdmin.IAuthorized;
}
