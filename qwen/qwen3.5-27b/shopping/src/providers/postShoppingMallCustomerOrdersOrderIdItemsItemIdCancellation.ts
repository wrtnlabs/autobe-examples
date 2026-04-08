import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestCollector } from "../collectors/ShoppingMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdCancellation(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  // Verify order item exists and get its order reference
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
      },
    });
  // Verify order item belongs to the specified order
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  // Verify order item status is 'paid' (not yet shipped)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation is only allowed for order items in paid status",
      400,
    );
  }
  // Verify customer owns the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  // Check if a pending cancellation request already exists
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: "pending",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item",
      409,
    );
  }
  // Create the cancellation request using collector and transformer
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallCustomers: {
          id: props.customer.id,
        },
        shoppingMallOrderItems: {
          id: props.itemId,
        },
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return await ShoppingMallCancellationRequestTransformer.transform(record);
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
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdCancellation(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequest.ICreate;
// }): Promise<IShoppingMallCancellationRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
//     data: await ShoppingMallCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCancellationRequestTransformer.select(),
//   });
//   return await ShoppingMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------