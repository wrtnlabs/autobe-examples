import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallCustomerOrdersOrderCodeCancellableItems(props: {
  customer: CustomerPayload;
  orderCode: string;
}): Promise<IECommerceMallOrder.ICancellableItem[]> {
  const order = await MyGlobal.prisma.e_commerce_mall_orders.findUniqueOrThrow({
    where: { code: props.orderCode },
    select: {
      id: true,
      e_commerce_mall_customer_id: true,
    },
  });
  if (order.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found", 404);
  }
  const orderItems = await MyGlobal.prisma.e_commerce_mall_order_items.findMany(
    {
      where: {
        e_commerce_mall_order_id: order.id,
        status: "paid",
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        created_at: true,
        productVariantSnapshot: {
          select: {
            product_name: true,
            variant_sku: true,
            variant_options: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    },
  );
  return orderItems.map((item) => {
    if (item.productVariantSnapshot === null) {
      throw new HttpException("Order item snapshot not found", 500);
    }
    const snapshot = item.productVariantSnapshot;
    return {
      id: item.id,
      product_name: snapshot.product_name,
      variant_sku: snapshot.variant_sku,
      variant_options: snapshot.variant_options,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
    };
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallCustomerOrdersOrderCodeCancellableItems(props: {
//   customer: CustomerPayload;
//   orderCode: string;
// }): Promise<IECommerceMallOrder.ICancellableItem> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------