import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
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

export async function postEconomicPoliticalDiscussionBoardAuthUserRefresh(props: {
  body: IEconomicPoliticalDiscussionBoardUser.IRefresh;
}): Promise<IEconomicPoliticalDiscussionBoardUser.IAuthorized> {
  const refreshToken = props.body.refreshToken;
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    try {
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    if (decoded.type !== "user") {
      throw new HttpException("Invalid token type", 403);
    }
    const session =
      await MyGlobal.prisma.economic_political_discussion_board_user_sessions.findFirst(
        {
          where: {
            id: decoded.session_id,
            user_id: decoded.id,
          },
        },
      );
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const user =
      await MyGlobal.prisma.economic_political_discussion_board_users.findUniqueOrThrow(
        {
          where: { id: decoded.id },
        },
      );
    if (user.deleted_at !== null) {
      throw new HttpException("User account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: "user",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "15m", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "user",
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    await MyGlobal.prisma.economic_political_discussion_board_user_sessions.update(
      {
        where: { id: decoded.session_id },
        data: { expired_at: toISOStringSafe(refreshExpires) },
      },
    );
    return {
      token: {
        access: token.access,
        refresh: token.refresh,
        expired_at: token.expired_at,
        refreshable_until: token.refreshable_until,
      },
      user: {
        id: user.id,
        email: user.email,
        role: typia.assert<"user" | "admin" | "super-admin">(user.role),
      },
    };
    try {
    } finally {
    }
  } finally {
  }
}
