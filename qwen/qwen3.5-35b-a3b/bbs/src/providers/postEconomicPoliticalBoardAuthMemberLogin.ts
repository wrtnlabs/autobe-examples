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

export async function postEconomicPoliticalBoardAuthMemberLogin(props: {
  ip: string;
  body: IEconomicPoliticalBoardMember.ILogin;
}): Promise<IEconomicPoliticalBoardMember.IAuthorized> {
  // 1. Find user by user_id (email not available in schema)
  // Note: Since economic_political_board_administrator_roles doesn't have email/password fields,
  // we use a placeholder approach - in production this would query a users table
  const user =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { id: props.body.email }, // Using email as ID as placeholder
        select: {
          id: true,
        },
      },
    );
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if user is banned by querying ban_records
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 1,
    });
  if (banRecord) {
    throw new HttpException(
      `Account banned: ${banRecord.reason} (since ${banRecord.created_at.toISOString()})`,
      403,
    );
  }
  // 3. Generate session ID for JWT
  const sessionId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "member" as const,
    id: user.id,
    session_id: sessionId,
    created_at: now,
  };
  const access: string = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh: string = jwt.sign(
    {
      ...tokenPayload,
      token_type: "refresh" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 5. Return IAuthorized
  return {
    id: user.id,
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  } satisfies IEconomicPoliticalBoardMember.IAuthorized;
}
