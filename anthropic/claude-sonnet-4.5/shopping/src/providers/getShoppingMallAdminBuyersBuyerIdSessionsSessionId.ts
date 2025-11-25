import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminBuyersBuyerIdSessionsSessionId(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyerSession> {
  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.findFirst({
    where: {
      id: props.sessionId,
      shopping_mall_buyer_id: props.buyerId,
    },
  });

  if (session === null) {
    throw new HttpException("Buyer session not found", 404);
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
