import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded = typia.assert<{
    id: string;
    session_id: string;
    type: "admin";
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 2: Validate session and get admin data
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_admin_id: decoded.id,
        expired_at: null,
      },
      include: {
        admin: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 3: Generate new tokens
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 4: Update session expiration
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  // Step 5: Return new admin authorized info
  return {
    id: session.admin.id,
    email: session.admin.email,
    password_hash: session.admin.password_hash,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at: session.admin.deleted_at
      ? toISOStringSafe(session.admin.deleted_at)
      : null,
    discussion_board_admin_sessions: undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
