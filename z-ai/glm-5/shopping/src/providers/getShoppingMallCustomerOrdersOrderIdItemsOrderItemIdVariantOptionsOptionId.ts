import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemVariantOptionTransformer } from "../transformers/ShoppingMallOrderItemVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItemsOrderItemIdVariantOptionsOptionId(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
  optionId: string;
}): Promise<IShoppingMallOrderItemVariantOption> {
  // Single query that validates the entire ownership chain:
  // 1. Variant option exists with optionId
  // 2. Belongs to order item with orderItemId
  // 3. Order item belongs to order with orderId
  // 4. Order belongs to the customer
  const variantOption =
    await MyGlobal.prisma.shopping_mall_order_item_variant_options.findUniqueOrThrow(
      {
        where: {
          id: props.optionId,
          orderItem: {
            id: props.orderItemId,
            order: {
              id: props.orderId,
              shopping_mall_customer_id: props.customer.id,
            },
          },
        },
        ...ShoppingMallOrderItemVariantOptionTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemVariantOptionTransformer.transform(
    variantOption,
  );
}
