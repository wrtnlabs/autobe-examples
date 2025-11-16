import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSellersSellerIdSessionsSessionId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException(
      "Session does not belong to the specified seller",
      404,
    );
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: session.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_seller_sessions.delete({
    where: { id: props.sessionId },
  });

  return {
    id: session.id,
    shopping_mall_seller_id: session.shopping_mall_seller_id,
    seller: {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: seller.email_verified,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
