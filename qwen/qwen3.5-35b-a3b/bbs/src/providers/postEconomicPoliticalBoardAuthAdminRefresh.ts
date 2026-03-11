import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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

export async function postEconomicPoliticalBoardAuthAdminRefresh(props: {
  body: IEconomicPoliticalBoardAdmin.IRefresh;
}): Promise<IEconomicPoliticalBoardAdmin.IAuthorized> {
  // 1. Verify refresh token signature and expiration
  let decoded: {
    type: "admin";
    id: string;
    session_id: string;
    tokenType: "refresh";
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin" || decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate admin user exists
  const admin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: decoded.id },
        select: { id: true },
      },
    );
  // 4. Check if admin has been banned by querying ban_records
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: { user_id: decoded.id },
    });
  if (banRecord) {
    throw new HttpException("Account has been banned", 403);
  }
  // 5. Calculate new expiration times
  const accessExpiresIn = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresIn = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // 6. Generate new tokens with same session_id
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIn,
      refreshable_until: refreshExpiresIn,
    },
  };
}
