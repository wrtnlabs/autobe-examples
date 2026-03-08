import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthAdminRefresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Verify session exists and is not expired
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_admin_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  if (Date.now() > session.expired_at.getTime()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Verify admin account is active and not banned
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      ...DiscussionBoardAdminTransformer.select(),
    },
  );
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (admin.banned_at !== null) {
    throw new HttpException("Account has been banned", 403);
  }
  // 5. Generate new tokens (CRITICAL: same session_id)
  const now = Date.now();
  const accessExpires = now + 60 * 60 * 1000; // 1 hour in ms
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  // 7. Return response with transformed admin and tokens
  return {
    ...(await DiscussionBoardAdminTransformer.transform(admin)),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: new Date(accessExpires).toISOString(),
      refreshable_until: new Date(refreshExpires).toISOString(),
    },
  };
}
