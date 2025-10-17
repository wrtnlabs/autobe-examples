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

export async function postAuthSellerLogout(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSeller.ILogoutResponse> {
  const { seller } = props;

  const activeSession = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      seller_id: seller.id,
      user_type: "seller",
      is_revoked: false,
    },
  });

  if (!activeSession) {
    throw new HttpException("Session not found or already logged out", 404);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: {
      id: activeSession.id,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
      last_activity_at: now,
    },
  });

  return {
    message: "Logged out successfully. Please remove all stored tokens.",
  };
}
