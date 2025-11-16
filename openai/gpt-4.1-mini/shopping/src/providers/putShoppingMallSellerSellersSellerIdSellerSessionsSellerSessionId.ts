import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellersSellerIdSellerSessionsSellerSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sellerSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IUpdate;
}): Promise<IShoppingMallSellerSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.sellerSessionId },
    });
  if (existing === null) {
    throw new HttpException("Seller session not found", 404);
  }
  if (existing.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException("Forbidden", 403);
  }

  const updateData: {
    last_active_at?: string | null;
    expired_at?: string | null;
    is_valid?: boolean;
  } = {};

  if ("last_active_at" in props.body) {
    const value = props.body.last_active_at;
    updateData.last_active_at =
      value !== null && value !== undefined ? toISOStringSafe(value) : null;
  }

  if ("expired_at" in props.body) {
    const value = props.body.expired_at;
    updateData.expired_at =
      value !== null && value !== undefined ? toISOStringSafe(value) : null;
  }

  if ("is_valid" in props.body) {
    updateData.is_valid = props.body.is_valid;
  }

  const updated = await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: props.sellerSessionId },
    data: updateData,
  });

  return {
    id: updated.id,
    seller_id: updated.shopping_mall_seller_id,
    ip: updated.ip === null ? undefined : updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expires_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
  } satisfies IShoppingMallSellerSession;
}
