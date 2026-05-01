import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewReviewCollector } from "../collectors/ShoppingMallReviewReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewReviewTransformer } from "../transformers/ShoppingMallReviewReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReviewReview.ICreate;
}): Promise<IShoppingMallReviewReview> {
  // Step 1: Verify the order belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_order_id },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Order does not belong to the authenticated customer",
      422,
    );
  }
  // Step 2: Verify the order item belongs to the order and references the product
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        status: true,
      },
    });
  if (orderItem.shopping_mall_order_id !== props.body.shopping_mall_order_id) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      422,
    );
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_product_variant_id },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (
    variant.shopping_mall_product_id !== props.body.shopping_mall_product_id
  ) {
    throw new HttpException(
      "Order item does not reference the specified product",
      422,
    );
  }
  // Step 3: Verify the order item is in delivered status
  if (orderItem.status !== "delivered") {
    throw new HttpException("Only delivered items can be reviewed", 422);
  }
  // Step 4: Check for existing review — one review per product per order
  const existing = await MyGlobal.prisma.shopping_mall_review_reviews.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        deleted_at: null,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException(
      "You have already reviewed this product for this order",
      409,
    );
  }
  // Create the review
  const record = await MyGlobal.prisma.shopping_mall_review_reviews.create({
    data: await ShoppingMallReviewReviewCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...ShoppingMallReviewReviewTransformer.select(),
  });
  return await ShoppingMallReviewReviewTransformer.transform(record);
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
// import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallReviewReview.ICreate;
// }): Promise<IShoppingMallReviewReview> {
//   const record = await MyGlobal.prisma.shopping_mall_review_reviews.create({
//     data: await ShoppingMallReviewReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallReviewReviewTransformer.select(),
//   });
//   return await ShoppingMallReviewReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------