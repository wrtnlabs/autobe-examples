import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
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

export async function postEconomicPoliticalDiscussionBoardAuthGuestRefresh(props: {
  body: IEconomicPoliticalDiscussionBoardGuest.IRefresh;
}): Promise<IEconomicPoliticalDiscussionBoardGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
      algorithms: ["HS256"],
    }) as {
      id: string;
      session_id: string;
      type: "guest";
    };
    // 2. Validate type
    if (decoded.type !== "guest") {
      throw new HttpException("Invalid token type", 403);
    }
    // 3. Validate session
    const session =
      await MyGlobal.prisma.economic_political_discussion_board_guest_sessions.findFirst(
        {
          where: {
            id: decoded.session_id,
            guest_id: decoded.id,
          },
        },
      );
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    // 4. Validate guest account
    const guest =
      await MyGlobal.prisma.economic_political_discussion_board_guests.findUniqueOrThrow(
        {
          where: { id: decoded.id },
        },
      );
    if (guest.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    // 5. Generate new tokens with the same session_id
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: "guest",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: new Date().toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "15m", issuer: "autobe", algorithm: "HS256" },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: new Date().toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe", algorithm: "HS256" },
      ),
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    };
    // 6. Update session expiration
    await MyGlobal.prisma.economic_political_discussion_board_guest_sessions.update(
      {
        where: { id: decoded.session_id },
        data: { expired_at: refreshExpires },
      },
    );
    return {
      id: guest.id,
      token: {
        access: token.access,
        refresh: token.refresh,
        expired_at: token.expired_at,
        refreshable_until: token.refreshable_until,
      },
    };
  } finally {
  }
}
