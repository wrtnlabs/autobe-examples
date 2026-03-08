import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function postEconomicPoliticalBoardAuthMemberRefresh(props: {
  body: IEconomicPoliticalBoardMember.IRefresh;
}): Promise<IEconomicPoliticalBoardMember.IAuthorized> {
  // 1. Verify refresh token signature and structure
  let decoded: {
    type: string;
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      type: string;
      id: string;
      session_id: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is member
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate user exists in administrator_roles table
  const user =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  // 4. Calculate expiration timestamps
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 5. Generate new access token (same session_id)
  const accessToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // 6. Generate new refresh token (same session_id)
  const refreshToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Return authorization response
  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
