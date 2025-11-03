import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  let verified: unknown;
  try {
    verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (
    typeof verified !== "object" ||
    verified === null ||
    Array.isArray(verified)
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Type narrowing and validation of required properties
  const verifiedObj = verified as Record<string, unknown>;
  if (
    typeof verifiedObj["id"] !== "string" ||
    typeof verifiedObj["session_id"] !== "string" ||
    typeof verifiedObj["type"] !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const decoded: { id: string; session_id: string; type: string } = {
    id: verifiedObj["id"] as string,
    session_id: verifiedObj["session_id"] as string,
    type: verifiedObj["type"] as string,
  };

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const guest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: { id: decoded.id },
  });

  if (!guest) {
    throw new HttpException("Guest account expired or revoked", 401);
  }

  const nowISOString = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = toISOStringSafe(accessExpiresDate);
  const refreshExpires = toISOStringSafe(refreshExpiresDate);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: decoded.id satisfies string as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    expires_at: accessExpires,
  };
}
