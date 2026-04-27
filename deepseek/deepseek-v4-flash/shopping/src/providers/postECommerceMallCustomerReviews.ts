import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallReviewTransformer } from "../transformers/ECommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IECommerceMallReview.ICreate;
}): Promise<IECommerceMallReview> {
  // 1. Fetch order item and verify it belongs to the authenticated customer
  const orderItem =
    await MyGlobal.prisma.e_commerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.body.order_item_id,
        order: { e_commerce_mall_customer_id: props.customer.id },
      },
      select: {
        id: true,
        status: true,
        e_commerce_mall_order_id: true,
        e_commerce_mall_product_variant_id: true,
      },
    });
  // 2. Status must be 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "The order item must be delivered before a review can be written.",
      422,
    );
  }
  // 3. Resolve product ID from the product variant
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
      where: { id: orderItem.e_commerce_mall_product_variant_id },
      select: { e_commerce_mall_product_id: true },
    });
  const productId: string = variant.e_commerce_mall_product_id;
  const orderId: string = orderItem.e_commerce_mall_order_id;
  // 4. Enforce one review per customer per product per order
  const existingReview =
    await MyGlobal.prisma.e_commerce_mall_reviews.findFirst({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        e_commerce_mall_product_id: productId,
        e_commerce_mall_order_id: orderId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingReview !== null) {
    throw new HttpException(
      "A review already exists for this product in this order.",
      422,
    );
  }
  // 5. Create the review with initial snapshot
  const reviewId: string = v4();
  const snapshotId: string = v4();
  const now: string = new Date().toISOString();
  const created = await MyGlobal.prisma.e_commerce_mall_reviews.create({
    data: {
      id: reviewId,
      rating: props.body.rating,
      content: props.body.content ?? null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: productId } },
      orderItem: { connect: { id: orderItem.id } },
      order: { connect: { id: orderId } },
      created_at: now,
      updated_at: now,
      deleted_at: null,
      snapshots: {
        create: {
          id: snapshotId,
          rating: props.body.rating,
          text: props.body.content ?? null,
          changed_fields: "created",
          created_at: now,
        },
      },
    },
    ...ECommerceMallReviewTransformer.select(),
  });
  return await ECommerceMallReviewTransformer.transform(created);
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
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallReview.ICreate;
// }): Promise<IECommerceMallReview> {
//   const record = await MyGlobal.prisma.e_commerce_mall_reviews.create({
//     data: await ECommerceMallReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallReviewTransformer.select(),
//   });
//   return await ECommerceMallReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------