import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallSellersShoppingMallSellerIdShoppingMallSellerSessionsShoppingMallSellerSessionId(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
  shoppingMallSellerSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IUpdate;
}): Promise<IShoppingMallSellerSession> {
  const { seller, shoppingMallSellerId, shoppingMallSellerSessionId, body } =
    props;

  const existing =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: shoppingMallSellerSessionId },
    });

  if (!existing) {
    throw new HttpException("Seller session not found", 404);
  }

  if (existing.shopping_mall_seller_id !== shoppingMallSellerId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: shoppingMallSellerSessionId },
    data: {
      ip: body.ip ?? undefined,
    },
  });

  return {
    id: updated.id,
    shoppingMallSellerId:
      updated.shopping_mall_seller_id satisfies string as string &
        tags.Format<"uuid">,
    ip: updated.ip ?? undefined,
    href: updated.href ?? undefined,
    referrer: updated.referrer ?? undefined,
    createdAt: toISOStringSafe(updated.created_at),
    expiredAt:
      updated.expired_at === null || updated.expired_at === undefined
        ? null
        : toISOStringSafe(updated.expired_at),
  } satisfies IShoppingMallSellerSession;
}
