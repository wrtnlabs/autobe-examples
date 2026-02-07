import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string;
}): Promise<void> {
  // Look up the session
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.sessionId },
    });
  // Return 404 if session doesn't exist
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Terminate session by setting expired_at to current time to mark as inactive
  // This follows the immutable audit trail principle by modifying the expiration
  // to indicate termination, not by deletion or adding new flags
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: props.sessionId },
    data: { expired_at: toISOStringSafe(new Date()) },
  });
  // Return 204 No Content
  return;
}
