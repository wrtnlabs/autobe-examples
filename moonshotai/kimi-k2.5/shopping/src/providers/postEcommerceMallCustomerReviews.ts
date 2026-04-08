import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function postEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  // Verify order item exists and belongs to customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        status: true,
        ecommerce_mall_product_id: true,
        ecommerce_mall_order_id: true,
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify ownership
  if (orderItem.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - order item does not belong to current customer",
      403,
    );
  }
  // Verify order item is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item status is not delivered", 422);
  }
  // Check if review already exists
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: { order_item_id: props.body.orderItemId },
      select: { id: true },
    });
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create review using collector and transformer
  const record = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body: props.body,
      customer: props.customer,
      orderItem: {
        id: orderItem.id,
        productId: orderItem.ecommerce_mall_product_id,
        orderId: orderItem.ecommerce_mall_order_id,
      },
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  return await EcommerceMallReviewTransformer.transform(record);
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerReviews(props: {
//   customer: CustomerPayload;
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