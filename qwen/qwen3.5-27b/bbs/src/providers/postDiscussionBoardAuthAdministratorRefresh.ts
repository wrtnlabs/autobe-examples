import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthAdministratorRefresh(props: {
  body: IDiscussionBoardAdministrator.IRefresh;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "administrator";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "administrator";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Hash the refresh token and find session
  const refreshTokenHash = await PasswordUtil.hash(props.body.refresh_token);
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_administrator_id: decoded.id,
        refresh_token_hash: refreshTokenHash,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session is active
  if (session.expired_at !== null) {
    throw new HttpException("Session has been terminated", 401);
  }
  // 5. Validate administrator not deleted
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.discussion_board_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
    },
  });
  // 8. Return administrator profile with new tokens
  return {
    id: administrator.id,
    email: administrator.email,
    display_name: administrator.display_name,
    bio: administrator.bio,
    grade: administrator.grade,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
