import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCitizenRefresh(props: {
  body: IEconomicBoardCitizen.IRefresh;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "citizen";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "citizen";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "citizen") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.economic_board_citizen_sessions.findFirst({
      where: {
        id: decoded.session_id,
        economic_board_citizen_id: decoded.id,
      },
      include: {
        citizen: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.citizen.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const now = new Date().toISOString();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access_token = jwt.sign(
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

  const refresh_token = jwt.sign(
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

  await MyGlobal.prisma.economic_board_citizen_sessions.update({
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
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
