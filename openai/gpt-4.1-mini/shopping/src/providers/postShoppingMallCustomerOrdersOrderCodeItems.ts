import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderCodeItems(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { customer, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or unauthorized", 404);
  }

  const now = toISOStringSafe(new Date());

  const createdAt = body.created_at ?? now;
  const updatedAt = body.updated_at ?? now;

  const createData: {
    id: string;
    shopping_mall_order_id: string;
    shopping_mall_product_sku_id: string & tags.Format<"uuid">;
    quantity: number & tags.Type<"int32">;
    unit_price: number;
    total_price: number;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at?: string | null;
  } = {
    id: v4(),
    shopping_mall_order_id: order.id,
    shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
    quantity: body.quantity,
    unit_price: body.unit_price,
    total_price: body.total_price,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  if (body.deleted_at !== undefined) {
    createData.deleted_at = body.deleted_at;
  }

  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: createData,
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
