import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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

interface IJwtPayload {
  type: string;
  id: string;
  session_id: string;
  created_at: string;
  tokenType?: string;
}
export async function postEcommerceAuthSuperAdministratorRefresh(props: {
  body: IEcommerceSuperAdministrator.IRefresh;
}): Promise<IEcommerceSuperAdministrator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as IJwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "superAdministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // 4. Validate session exists and is active
  const session =
    await MyGlobal.prisma.ecommerce_super_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_super_administrator_id: decoded.id,
        expired_at: { gt: new Date(now) },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate super administrator account is active
  const superAdmin =
    await MyGlobal.prisma.ecommerce_super_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Calculate new expiration times
  const nowDate = new Date(now);
  const accessExpires = new Date(nowDate.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpiresISO = toISOStringSafe(accessExpires);
  const refreshExpiresISO = toISOStringSafe(refreshExpires);
  // 7. Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "superAdministrator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdministrator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session expiration
  await MyGlobal.prisma.ecommerce_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 9. Return authorized response with proper typing
  return {
    id: superAdmin.id satisfies string as string & tags.Format<"uuid">,
    email: superAdmin.email satisfies string as string & tags.Format<"email">,
    created_at: toISOStringSafe(
      superAdmin.created_at,
    ) satisfies string as string & tags.Format<"date-time">,
    updated_at: toISOStringSafe(
      superAdmin.updated_at,
    ) satisfies string as string & tags.Format<"date-time">,
    deleted_at: superAdmin.deleted_at
      ? (toISOStringSafe(superAdmin.deleted_at) satisfies string as string &
          tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO satisfies string as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpiresISO satisfies string as string &
        tags.Format<"date-time">,
    },
  };
}
