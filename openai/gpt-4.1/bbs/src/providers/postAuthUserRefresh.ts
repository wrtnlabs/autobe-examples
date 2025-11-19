import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: IDiscussionBoardUser.IRefresh;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  let decoded: any;
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired token", 401);
  }
  if (
    !decoded ||
    decoded.type !== "user" ||
    !decoded.id ||
    !decoded.session_id
  ) {
    throw new HttpException("Invalid refresh token structure", 401);
  }
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        user_id: decoded.id,
      },
      include: {
        user: true,
      },
    });
  if (!session) {
    throw new HttpException("Session is invalid or expired", 401);
  }
  if (!session.user || session.user.deleted_at !== null) {
    throw new HttpException("Account is unavailable", 403);
  }
  // Compute expiration times as ISO string directly
  const nowEpoch = Date.now();
  const accessExpiresEpoch = nowEpoch + 60 * 60 * 1000;
  const refreshExpiresEpoch = nowEpoch + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresStr = toISOStringSafe(new Date(accessExpiresEpoch));
  const refreshExpiresStr = toISOStringSafe(new Date(refreshExpiresEpoch));
  // Generate tokens
  const nowIsoString = toISOStringSafe(new Date(nowEpoch));
  const access = jwt.sign(
    {
      type: "user",
      id: session.user.id,
      session_id: session.id,
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: session.user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(refreshExpiresEpoch) },
  });
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at:
      session.user.deleted_at === null
        ? null
        : toISOStringSafe(session.user.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiresStr,
      refreshable_until: refreshExpiresStr,
    },
  };
}
