import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthAdminJoin(props: {
  ip: string;
  body: IRedditLikeAdmin.IJoin;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const existing = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const admin = await MyGlobal.prisma.reddit_like_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatarUrl ?? null,
      karma_score: 0,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
    },
  });
  const session = await MyGlobal.prisma.reddit_like_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_admin_id: admin.id,
      ip: props.ip,
      href: "/",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
    select: {
      id: true,
      reddit_like_admin_id: true,
      ip: true,
      href: true,
      created_at: true,
      expired_at: true,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh" as const,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  } satisfies IAuthorizationToken;
  const emailVerificationToken =
    await MyGlobal.prisma.reddit_like_admin_email_verifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_admin_id: admin.id,
        token: v4(),
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString() as string & tags.Format<"date-time">,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_like_admin_id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: admin.id,
    token,
  } satisfies IRedditLikeAdmin.IAuthorized;
}
