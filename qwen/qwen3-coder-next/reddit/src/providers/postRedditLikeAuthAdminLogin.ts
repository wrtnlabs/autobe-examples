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
import { RedditLikeAdminAtSummaryTransformer } from "../transformers/RedditLikeAdminAtSummaryTransformer";
import { RedditLikeAdminTransformer } from "../transformers/RedditLikeAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthAdminLogin(props: {
  ip: string;
  body: IRedditLikeAdmin.ILogin;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...RedditLikeAdminTransformer.select().select,
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
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_admin_id: admin.id,
      ip: props.ip,
      href: "/",
      referrer: null,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    created_at: toISOStringSafe(now),
  };
  const refreshPayload = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: toISOStringSafe(now),
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 5. Return IAuthorized
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await RedditLikeAdminTransformer.transform(admin)),
    admin: await RedditLikeAdminAtSummaryTransformer.transform({
      id: admin.id,
      username: admin.username,
      display_name: admin.display_name,
    }),
    token,
  } satisfies IRedditLikeAdmin.IAuthorized;
}
