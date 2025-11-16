import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserRefresh";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function postAuthAdminUserRefresh(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardAdminUserRefresh.IRequest;
}): Promise<IDiscussionBoardAdminuser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let rawDecoded: unknown;
  try {
    rawDecoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const decoded = typia.assert<{
    id: string;
    session_id: string;
    type: string;
  }>(rawDecoded);

  if (decoded.type !== "adminuser") {
    throw new HttpException("Invalid token type", 403);
  }

  // 2. Validate session exists and is active
  const session =
    await MyGlobal.prisma.discussion_board_adminuser_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_adminuser_id: decoded.id,
        expired_at: null,
      },
    });

  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 3. Load admin user and validate lifecycle state
  const admin = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      id: decoded.id,
    },
  });

  if (admin === null) {
    throw new HttpException("Admin account not found", 404);
  }

  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  if (admin.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // 4. Generate new tokens (reuse same session)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // 5. Update session expiration to match new refresh window
  await MyGlobal.prisma.discussion_board_adminuser_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // 6. Build authorized admin response
  const authorized: IDiscussionBoardAdminuser.IAuthorized = {
    id: admin.id,
    loginId: (admin as any).login_id,
    displayName: admin.display_name,
    email: admin.email,
    status: admin.account_status,
    role: (admin as any).role,
    emailVerified: admin.email_verified,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    token,
  } as IDiscussionBoardAdminuser.IAuthorized;

  return authorized;
}
