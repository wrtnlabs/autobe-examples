import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardAdministratorAtSummaryTransformer } from "../transformers/EconomicBoardAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicBoardAuthAdministratorLogin(props: {
  body: IEconomicBoardAdministrator.ILogin;
}): Promise<IEconomicBoardAdministrator.IAuthorized> {
  // 1. Find administrator with explicit password_hash
  const admin = await MyGlobal.prisma.economic_board_administrators.findFirst({
    where: { email: props.body.email },
    select: {
      ...EconomicBoardAdministratorAtSummaryTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check banned status
  if (admin.is_banned)
    throw new HttpException("Your account has been banned", 403);
  // 4. Create new session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_board_administrator_sessions.create({
      data: {
        id: v4(),
        administrator_id: admin.id,
        ip: "unknown",
        href: "unknown",
        referrer: "unknown",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "14d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Transform admin data
  const transformedAdmin =
    await EconomicBoardAdministratorAtSummaryTransformer.transform(admin);
  // 7. Construct complete IAuthorized object with explicit status mapping
  const mappedStatus: IEconomicBoardAdministrator["admin_request_status"] =
    admin.admin_request_status === "pending"
      ? "pending"
      : admin.admin_request_status === "approved"
        ? "approved"
        : admin.admin_request_status === "rejected"
          ? "rejected"
          : "pending"; // Default fallback as per business rules
  return {
    ...transformedAdmin,
    role: "administrator",
    admin_request_status: mappedStatus,
    updated_at: admin.updated_at?.toISOString() ?? null,
    access_token: token.access,
    refresh_token: token.refresh,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at satisfies string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until satisfies string &
        tags.Format<"date-time">,
    },
  } satisfies IEconomicBoardAdministrator.IAuthorized;
}
