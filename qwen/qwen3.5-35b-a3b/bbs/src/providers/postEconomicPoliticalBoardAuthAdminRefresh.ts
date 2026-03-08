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
  // 1. Verify refresh token
  const decodedPayload = typia.assert<{
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as any,
  );
  // 2. Validate type
  if (decodedPayload.type !== "admin") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Check for ban records
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: { user_id: decodedPayload.id },
    });
  if (banRecord !== null) {
    throw new HttpException("Account has been banned", 403);
  }
  // 4. Validate administrator exists
  await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
    {
      where: { id: decodedPayload.id },
    },
  );
  // 5. Generate new tokens (SAME session_id)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const currentTimestamp: string = toISOStringSafe(new Date());
  const newAccessToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: decodedPayload.id,
      session_id: decodedPayload.session_id,
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: decodedPayload.id,
      session_id: decodedPayload.session_id,
      tokenType: "refresh",
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: decodedPayload.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
