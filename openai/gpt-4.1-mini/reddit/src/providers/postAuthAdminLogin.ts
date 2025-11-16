import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ILogin;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.reddit_community_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });

  if (admin === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const validPassword = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpireAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();

  const session = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: sessionId as string & tags.Format<"uuid">,
      reddit_community_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpireAt),
    },
  });

  const tokenAccess = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const tokenRefresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    name: "",
    role: "",
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    is_active: false,
    last_login_at: "",
    last_login_ip: "",
    permissions: [],
    notes: "",
    avatar_url: "",
    settings: undefined,
    token: {
      access: tokenAccess,
      refresh: tokenRefresh,
      expired_at: toISOStringSafe(accessExpireAt),
      refreshable_until: toISOStringSafe(refreshExpireAt),
    },
  };
}
