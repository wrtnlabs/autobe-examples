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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerIdSessionsSessionId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
      include: {
        seller: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id as string & tags.Format<"uuid">,
    shopping_mall_seller_id: session.shopping_mall_seller_id as string &
      tags.Format<"uuid">,
    seller: {
      id: session.seller.id as string & tags.Format<"uuid">,
      store_name: session.seller.store_name,
      email: session.seller.email as string & tags.Format<"email">,
      status: session.seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: session.seller.email_verified,
    },
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer as string & tags.Format<"uri">,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  };
}
