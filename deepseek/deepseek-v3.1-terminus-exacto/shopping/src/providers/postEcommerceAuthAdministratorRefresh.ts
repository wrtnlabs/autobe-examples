import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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

export async function postEcommerceAuthAdministratorRefresh(props: {
  body: IEcommerceAdministrator.IRefresh;
}): Promise<IEcommerceAdministrator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
      tokenType?: string;
      created_at: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type and structure
  if (decoded.type !== "administrator" || decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate current time for session checking
  const currentTime = new Date();
  // 4. Validate session exists and is active
  const session =
    await MyGlobal.prisma.ecommerce_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_administrator_id: decoded.id,
        expires_at: { gt: currentTime },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate administrator account is active
  const admin =
    await MyGlobal.prisma.ecommerce_administrators.findUniqueOrThrow({
      where: {
        id: decoded.id,
        deleted_at: null,
      },
    });
  // 6. Prepare expiration timestamps
  const accessExpires = new Date(currentTime.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(
    currentTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days
  // 7. Generate new tokens with same session ID
  const newAccessToken = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: currentTime.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: currentTime.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens and expiration
  await MyGlobal.prisma.ecommerce_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: refreshExpires,
      last_used_at: currentTime,
    },
  });
  // 9. Construct and return response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at
      ? (toISOStringSafe(admin.deleted_at) as string & tags.Format<"date-time">)
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceAdministrator.IAuthorized;
}
