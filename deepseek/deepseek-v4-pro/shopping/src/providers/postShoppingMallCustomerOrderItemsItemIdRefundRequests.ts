import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrderItemsItemIdRefundRequests(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        status: true,
        updated_at: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status === "refunded") {
    throw new HttpException("This order item has already been refunded", 409);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Only delivered items are eligible for refund",
      422,
    );
  }
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime: number = Date.now() - SEVEN_DAYS_MS;
  if (orderItem.updated_at.getTime() < cutoffTime) {
    throw new HttpException("The 7-day refund window has expired", 422);
  }
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: { in: ["pending", "approved"] },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "A refund request is already in progress for this item",
        409,
      );
    }
    return await tx.shopping_mall_refund_requests.create({
      data: await ShoppingMallRefundRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItems: { id: props.itemId },
        shoppingMallCustomers: { id: props.customer.id },
        shoppingMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  });
  return await ShoppingMallRefundRequestTransformer.transform(record);
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
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerOrderItemsItemIdRefundRequests(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallRefundRequest.ICreate;
// }): Promise<IShoppingMallRefundRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_refund_requests.create({
//     data: await ShoppingMallRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallRefundRequestTransformer.select(),
//   });
//   return await ShoppingMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------