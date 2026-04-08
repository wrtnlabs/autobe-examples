import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdRefund(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Verify order item exists and get order for ownership check
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        status: true,
        updated_at: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  // Verify ownership - order must belong to authenticated customer
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // Check 7-day window from delivery (using updated_at as delivery timestamp)
  const deliveryDate = orderItem.updated_at;
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (now.getTime() - deliveryDate.getTime() > sevenDaysMs) {
    throw new HttpException(
      "Refund requests must be submitted within 7 days of delivery",
      400,
    );
  }
  // Check for existing pending refund request
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending refund request already exists for this item",
      409,
    );
  }
  // Create refund request using collector
  const record = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
      shoppingMallOrderItems: {
        id: orderItem.id,
      },
      shoppingMallCustomers: {
        id: props.customer.id,
      },
      shoppingMallCustomerSessions: {
        id: props.customer.session_id,
      },
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
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
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdRefund(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
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