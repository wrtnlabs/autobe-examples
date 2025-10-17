import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerIdSessionsSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSession> {
  const { seller, sellerId, sessionId } = props;

  // Authorization: Verify the sellerId in path matches authenticated seller
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: Cannot access another seller's sessions",
      403,
    );
  }

  // Query the session with ownership validation
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      id: sessionId,
      user_type: "seller",
      seller_id: sellerId,
    },
  });

  // Session not found or doesn't belong to seller
  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Map to DTO with proper type conversions
  return {
    id: session.id as string & tags.Format<"uuid">,
    user_type: session.user_type,
    refresh_token_expires_at: toISOStringSafe(session.refresh_token_expires_at),
    ip_address: session.ip_address,
    device_type: session.device_type ?? undefined,
    device_name: session.device_name ?? undefined,
    browser_name: session.browser_name ?? undefined,
    operating_system: session.operating_system ?? undefined,
    approximate_location: session.approximate_location ?? undefined,
    is_revoked: session.is_revoked,
    revoked_at: session.revoked_at
      ? toISOStringSafe(session.revoked_at)
      : undefined,
    last_activity_at: toISOStringSafe(session.last_activity_at),
    created_at: toISOStringSafe(session.created_at),
  };
}
