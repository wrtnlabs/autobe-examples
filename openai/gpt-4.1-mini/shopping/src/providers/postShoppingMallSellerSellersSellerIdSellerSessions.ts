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

export async function postShoppingMallSellerSellersSellerIdSellerSessions(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.ICreate;
}): Promise<IShoppingMallSellerSession> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException("Forbidden", 403);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: props.sellerId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: props.body.expiresAt ?? null,
    },
  });

  return {
    id: created.id,
    seller_id: created.shopping_mall_seller_id,
    ip: created.ip === null ? undefined : created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expires_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
