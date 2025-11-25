import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerBuyersBuyerIdSessionsSessionId(props: {
  buyer: BuyerPayload;
  buyerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyerSession> {
  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.findUnique(
    {
      where: { id: props.sessionId },
    },
  );

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.shopping_mall_buyer_id !== props.buyerId) {
    throw new HttpException(
      "Session does not belong to the specified buyer",
      403,
    );
  }

  if (props.buyer.id !== props.buyerId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  return {
    id: session.id,
    shopping_mall_buyer_id: session.shopping_mall_buyer_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
