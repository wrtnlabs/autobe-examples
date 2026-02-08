import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
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

export async function postDiscussionBoardAuthSuperAdministratorRefresh(props: {
  body: IDiscussionBoardSuperAdministrator.IRefresh & {
    refreshToken: string;
  };
}): Promise<IDiscussionBoardSuperAdministrator.IAuthorized> {
  const refreshToken = props.body.refreshToken;
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "superadministrator";
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "superadministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // Current time as ISO string
  const currentTime = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.discussion_board_super_administrator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          super_administrator_id: decoded.id,
          expired_at: {
            gt: currentTime,
          },
          deleted_at: null,
        },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const admin =
    await MyGlobal.prisma.discussion_board_super_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration timestamps
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );
  // Current timestamp for token creation
  const tokenCreatedAt = toISOStringSafe(new Date());
  // Generate access token
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Generate refresh token
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.discussion_board_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiredAt },
  });
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
