import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdReview(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  // Verify order item exists and belongs to authenticated customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      status: true,
      ecommerce_mall_product_id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException(
      "Order item not found or does not belong to you",
      404,
    );
  }
  // Verify order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "You can only review products after the order item has been delivered",
      400,
    );
  }
  // Verify no existing review for this customer + product + order_item
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_product_id: orderItem.ecommerce_mall_product_id,
        ecommerce_mall_order_item_id: orderItem.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existingReview !== null) {
    throw new HttpException(
      "You have already reviewed this product for this order",
      409,
    );
  }
  // Create review using Collector
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body: props.body,
      ecommerceMallOrderItems: { id: props.itemId },
      ecommerceMallCustomers: { id: props.customer.id },
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  // Return transformed response
  return await EcommerceMallReviewTransformer.transform(created);
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdReview(props: {
//   customer: CustomerPayload;
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