import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewCollector } from "../collectors/ShoppingMallReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Verify the order item exists and belongs to the authenticated customer
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_order_item_id,
      },
      select: {
        id: true,
        status: true,
        shopping_mall_product_variant_id: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
        productVariant: {
          select: {
            shopping_mall_product_id: true,
          },
        },
      },
    });
  // Verify the order belongs to the authenticated customer
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered before writing a review",
      403,
    );
  }
  // Verify the product_id matches the order item's product
  if (
    props.body.shopping_mall_product_id !==
    orderItem.productVariant.shopping_mall_product_id
  ) {
    throw new HttpException(
      "Product ID does not match the order item's product",
      400,
    );
  }
  // Verify no existing review for this order item
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      },
    },
  );
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create the review
  const record = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      customer: {
        id: props.customer.id,
      },
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(record);
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
// import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallReview.ICreate;
// }): Promise<IShoppingMallReview> {
//   const record = await MyGlobal.prisma.shopping_mall_reviews.create({
//     data: await ShoppingMallReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallReviewTransformer.select(),
//   });
//   return await ShoppingMallReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------