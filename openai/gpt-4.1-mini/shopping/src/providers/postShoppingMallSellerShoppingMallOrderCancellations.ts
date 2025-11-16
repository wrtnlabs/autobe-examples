import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallOrderCancellations(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderCancellation.ICreate;
}): Promise<IShoppingMallOrderCancellation> {
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_order_cancellations.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        shopping_mall_customer_id: props.seller.id,
        reason: props.body.reason ?? undefined,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    reason: created.reason ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
