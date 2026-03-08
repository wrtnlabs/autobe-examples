import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
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

export async function postEconomicPoliticalBoardAuthGuestRefresh(props: {
  body: IEconomicPoliticalBoardGuest.IRefresh;
}): Promise<IEconomicPoliticalBoardGuest.IAuthorized> {
  // 1. Verify refresh token
  const verifyResult = typia.assert<{
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  const decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  } = verifyResult;
  // 2. Validate type is guest
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Check if user is banned
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: {
        user_id: decoded.id,
      },
    });
  if (banRecord !== null) {
    throw new HttpException("User account has been banned", 401);
  }
  // 4. Verify user exists
  await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  // 5. Generate new tokens (SAME session_id)
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const access: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return response
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    expired_at: accessExpires,
    token: {
      access,
      refresh,
      refreshable_until: refreshExpires,
      expired_at: accessExpires,
    } satisfies IAuthorizationToken,
  } satisfies IEconomicPoliticalBoardGuest.IAuthorized;
}
