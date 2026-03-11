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

export async function postEconomicPoliticalBoardAuthMemberJoin(props: {
  ip: string;
  body: IEconomicPoliticalBoardMember.IJoin;
}): Promise<IEconomicPoliticalBoardMember.IAuthorized> {
  const { email, password, name, href, referrer } = props.body;
  // 1. Check email uniqueness using user_id field
  const existingMember =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: email },
      },
    );
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate UUID for member
  const memberId: string & tags.Format<"uuid"> = v4();
  // 3. Create member record with only existing fields
  const createdMember =
    await MyGlobal.prisma.economic_political_board_administrator_roles.create({
      data: {
        id: memberId,
        user_id: memberId,
        grade: "member",
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        user_id: true,
      },
    });
  // 4. Generate JWT tokens
  const sessionUuid: string & tags.Format<"uuid"> = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenPayload = {
    type: "member" as const,
    id: memberId,
    session_id: sessionUuid,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        token_type: "refresh" as const,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized
  return {
    id: memberId,
    token,
  } satisfies IEconomicPoliticalBoardMember.IAuthorized;
}
