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

export async function postShoppingMallSellerShoppingMallSellersShoppingMallSellerIdShoppingMallSellerSessions(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.ICreate;
}): Promise<IShoppingMallSellerSession> {
  if (props.seller.id !== props.shoppingMallSellerId) {
    throw new HttpException("Forbidden", 403);
  }

  const id = v4() as unknown as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id,
      shoppingMallSeller: { connect: { id: props.shoppingMallSellerId } },
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    shoppingMallSellerId: created.shopping_mall_seller_id,
    ip: created.ip ?? "",
    href: created.href,
    referrer: created.referrer,
    createdAt: toISOStringSafe(created.created_at),
    expiredAt:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
  };
}
