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

export async function postRedditLikeAuthAdminRefresh(props: {
  body: IRedditLikeAdmin.IRefresh;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: any;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session
  const session = await MyGlobal.prisma.reddit_like_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_admin_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin exists
  const admin = await MyGlobal.prisma.reddit_like_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.reddit_like_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // 7. Build response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio ?? null,
    avatar_url: admin.avatar_url ?? null,
    karma_score: admin.karma_score as number & tags.Type<"int32">,
    admin: {
      id: admin.id as string & tags.Format<"uuid">,
      username: admin.username,
      display_name: admin.display_name,
    },
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
