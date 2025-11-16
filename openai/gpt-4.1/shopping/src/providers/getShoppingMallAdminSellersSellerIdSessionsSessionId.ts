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

export async function getShoppingMallAdminSellersSellerIdSessionsSessionId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: props.sessionId,
        shopping_mall_seller_id: props.sellerId,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session not found for the specified seller.", 404);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: { id: true, business_name: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found.", 404);
  }
  return {
    id: session.id,
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      typeof session.expired_at === "undefined"
        ? undefined
        : session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
  };
}
