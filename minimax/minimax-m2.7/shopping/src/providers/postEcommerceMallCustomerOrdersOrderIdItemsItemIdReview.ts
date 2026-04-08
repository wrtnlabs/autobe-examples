import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewCollector } from "../collectors/EcommerceMallReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrdersOrderIdItemsItemIdReview(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  // 1. Validate order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, ecommerce_mall_customer_id: true },
  });
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate order item exists for the given order and check delivered status
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        status: true,
        ecommerce_mall_product_id: true,
      },
    });
  if (orderItem.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  // 3. Verify order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Reviews can only be written for delivered items",
      400,
    );
  }
  // 4. Check for existing review (duplicate prevention)
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: {
        ecommerce_mall_customer_id_ecommerce_mall_product_id_ecommerce_mall_order_item_id:
          {
            ecommerce_mall_customer_id: props.customer.id,
            ecommerce_mall_product_id: orderItem.ecommerce_mall_product_id,
            ecommerce_mall_order_item_id: props.itemId,
          },
      },
    });
  if (existingReview !== null) {
    throw new HttpException(
      "A review already exists for this product in this order",
      400,
    );
  }
  // 5. Create review using collector for data transformation
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
      product: { id: orderItem.ecommerce_mall_product_id },
      orderItem: { id: props.itemId },
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  // 6. Transform and return response
  return await EcommerceMallReviewTransformer.transform(review);
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
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerOrdersOrderIdItemsItemIdReview(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IEcommerceMallReview.ICreate;
// }): Promise<IEcommerceMallReview> {
//   const record = await MyGlobal.prisma.ecommerce_mall_reviews.create({
//     data: await EcommerceMallReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallReviewTransformer.select(),
//   });
//   return await EcommerceMallReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------