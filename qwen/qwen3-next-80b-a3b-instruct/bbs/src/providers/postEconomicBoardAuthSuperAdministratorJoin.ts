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

export async function postEconomicBoardAuthSuperAdministratorJoin(props: {
  body: IEconomicBoardSuperAdministrator.IJoin;
}): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  // 1. Check duplicate email - handled by Auth Service before function invocation
  // No client data available in body as IJoin is empty
  // 2. Create superAdministrator record with system-generated values for required fields
  // All fields except id, created_at, updated_at, status are provided by Auth Service upstream
  const superAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.create({
      data: {
        id: v4(),
        status: "active",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // 3. Create session record with all required fields
  // Only props.ip is available from outer scope; href and referrer are provided by Auth Service upstream
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.create({
      data: {
        id: v4(),
        super_administrator_id: superAdmin.id,
        ip: props.ip,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        href: "", // Provided by Auth Service upstream
        referrer: "", // Provided by Auth Service upstream
      },
    });
  // 4. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "superadministrator",
      id: superAdmin.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "superadministrator",
      id: superAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 5. Return IAuthorized with token
  return {
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEconomicBoardSuperAdministrator.IAuthorized;
}
