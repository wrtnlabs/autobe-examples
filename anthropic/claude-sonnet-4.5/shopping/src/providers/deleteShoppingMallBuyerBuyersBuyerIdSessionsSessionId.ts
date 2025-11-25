import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerBuyersBuyerIdSessionsSessionId(props: {
  buyer: BuyerPayload;
  buyerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ownership: buyer can only delete their own sessions
  if (props.buyer.id !== props.buyerId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Delete the session using deleteMany for idempotent behavior
  // This will succeed even if the session doesn't exist
  await MyGlobal.prisma.shopping_mall_buyer_sessions.deleteMany({
    where: {
      id: props.sessionId,
      shopping_mall_buyer_id: props.buyerId,
    },
  });
}
