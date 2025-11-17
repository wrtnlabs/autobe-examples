import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IEconomicBoardModerator.IRefresh;
}): Promise<IEconomicBoardModerator.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(props.body, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.economic_board_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        economic_board_moderator_id: decoded.id,
        expired_at: { not: null },
      },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
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
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.economic_board_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
