import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerIdSessionsSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "You do not have permission to access this seller's session.",
      403,
    );
  }
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: props.sessionId,
        shopping_mall_seller_id: props.sellerId,
      },
      include: {
        seller: {
          select: {
            id: true,
            business_name: true,
          },
        },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }
  return {
    id: session.id,
    seller: {
      id: session.seller.id,
      business_name: session.seller.business_name,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  };
}
