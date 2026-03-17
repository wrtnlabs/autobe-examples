import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Verify refresh token
  const decoded: {
    type: "seller";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as unknown as typeof decoded;
  // 2. Validate type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate seller exists and not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const access = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(accessExpires),
    },
  });
  // 7. Return new token pair
  return {
    id: seller.id,
    email: seller.email,
    created_at: toISOStringSafe(seller.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(seller.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
