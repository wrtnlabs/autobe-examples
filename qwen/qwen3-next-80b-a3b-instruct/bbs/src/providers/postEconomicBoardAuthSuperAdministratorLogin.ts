import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
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

export async function postEconomicBoardAuthSuperAdministratorLogin(props: {
  body: IEconomicBoardSuperAdministrator.ILogin;
}): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  // Search for superAdministrator in citizens or administrators
  const citizen = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      ban_reason: true,
    },
  });
  const administrator =
    await MyGlobal.prisma.economic_board_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        ban_reason: true,
      },
    });
  const user = citizen ?? administrator;
  if (!user) throw new HttpException("Invalid credentials", 401);
  if (user.is_banned) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create NEW session in correct session table
  // We'll use administrator_sessions if user is an administrator, citizen_sessions if citizen
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Fix: Assert the dynamic model type to resolve union method ambiguity
  const sessionModel = (
    user.id.startsWith("admin")
      ? MyGlobal.prisma.economic_board_administrator_sessions
      : MyGlobal.prisma.economic_board_citizen_sessions
  ) as any;
  const session = await sessionModel.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_administrator_id: user.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  // Generate JWT token
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        id: user.id,
        session_id: session.id,
        type: "superadministrator",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        id: user.id,
        session_id: session.id,
        type: "superadministrator",
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return IAuthorized
  const response: IEconomicBoardSuperAdministrator.IAuthorized = {
    id: user.id,
    token,
  };
  return response;
}
