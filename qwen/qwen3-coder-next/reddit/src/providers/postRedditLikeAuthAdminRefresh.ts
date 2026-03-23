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
  // 1. Verify refresh token and decode
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.reddit_like_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_admin_id: decoded.id,
      expired_at: { gte: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin account not deleted
  const admin = await MyGlobal.prisma.reddit_like_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new access token with same session_id
  const accessExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  const token = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "2h", issuer: "autobe" },
  );
  // 6. Return response
  return {
    id: admin.id,
    token: {
      access: token,
      refresh: props.body.refresh,
      expired_at: accessExpires.toISOString(),
      refreshable_until: session.expired_at.toISOString(),
    },
  };
}
