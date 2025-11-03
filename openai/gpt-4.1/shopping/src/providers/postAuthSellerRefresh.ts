import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function postAuthSellerRefresh(props: {
  body: IShoppingSeller.IRefresh;
}): Promise<IShoppingSeller.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "seller" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "seller" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "seller") {
    throw new HttpException("Token does not belong to a seller", 403);
  }
  const session = await MyGlobal.prisma.shopping_seller_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_seller_id: decoded.id,
    },
    include: {
      seller: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (
    session.expired_at &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException(
      "Session is no longer valid (expired/revoked)",
      401,
    );
  }
  if (!session.seller || session.seller.deleted_at !== null) {
    throw new HttpException("Seller account is no longer active", 403);
  }
  const nowISO = toISOStringSafe(new Date());
  const access_expiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refresh_expiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: session.seller.id,
      session_id: session.id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: session.seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.shopping_seller_sessions.update({
    where: { id: session.id },
    data: { expired_at: refresh_expiry },
  });
  return {
    id: session.seller.id,
    email: session.seller.email,
    display_name: session.seller.display_name,
    contact_phone: session.seller.contact_phone,
    status: session.seller.status,
    is_active:
      session.seller.status === "active" && session.seller.deleted_at === null,
    created_at: toISOStringSafe(session.seller.created_at),
    updated_at: toISOStringSafe(session.seller.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: access_expiry,
      refreshable_until: refresh_expiry,
    },
  };
}
