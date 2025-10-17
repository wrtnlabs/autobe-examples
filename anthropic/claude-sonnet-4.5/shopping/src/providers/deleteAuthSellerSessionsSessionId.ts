import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteAuthSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller.ISessionRevokeResponse> {
  const { seller, sessionId } = props;

  // Find the session to revoke
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      id: sessionId,
      seller_id: seller.id,
      user_type: "seller",
    },
  });

  // Verify session exists and belongs to this seller
  if (!session) {
    throw new HttpException(
      "Session not found or you do not have permission to revoke it",
      404,
    );
  }

  // Check if session is already revoked
  if (session.is_revoked) {
    throw new HttpException("Session is already revoked", 400);
  }

  // Revoke the session
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: { id: sessionId },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });

  // Return success response
  return {
    message: "Session revoked successfully",
    revoked_session_id: sessionId,
    device_name: session.device_name === null ? undefined : session.device_name,
  };
}
