import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function postDiscussionBoardAuthRegisteredUserRefresh(props: {
  body: IDiscussionBoardRegisteredUser.IRefresh;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // Access refresh token property by casting to any because IRefresh type lacks it
  const refreshToken = (props.body as any).refreshToken ?? "";
  const decodedRaw = (() => {
    try {
      return jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  function isPayload(input: unknown): input is {
    type: "registereduser";
    id: string;
    session_id: string;
  } {
    return (
      typeof input === "object" &&
      input !== null &&
      (input as any).type === "registereduser" &&
      typeof (input as any).id === "string" &&
      typeof (input as any).session_id === "string"
    );
  }
  if (!isPayload(decodedRaw)) {
    throw new HttpException("Invalid token type or payload", 403);
  }
  const decoded = decodedRaw;
  // Removed non-existent property discussionBoardRegisteredUserId in where clause
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) throw new HttpException("Session expired or revoked", 401);
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: decoded.id },
    });
  if (!user) throw new HttpException("User not found", 404);
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 3600 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days
  const accessExpiresString = toISOStringSafe(accessExpires);
  const refreshExpiresString = toISOStringSafe(refreshExpires);
  const issuedAtString = toISOStringSafe(now);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: issuedAtString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: issuedAtString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.discussion_board_registered_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresString },
  });
  return {
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
    },
  };
}
