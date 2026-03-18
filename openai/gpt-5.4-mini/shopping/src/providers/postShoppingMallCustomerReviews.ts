import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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
  const review = await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        status: true,
        delivered_at: true,
        order: {
          select: {
            id: true,
            customer: { select: { id: true } },
          },
        },
        productVariant: {
          select: {
            id: true,
            product: { select: { id: true } },
          },
        },
      },
    });
    if (orderItem.order.customer.id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (orderItem.status !== "delivered" || orderItem.delivered_at === null) {
      throw new HttpException("Review requires delivered purchase", 422);
    }
    if (
      orderItem.productVariant.product.id !==
      props.body.shopping_mall_product_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const duplicate = await prisma.shopping_mall_reviews.findFirst({
      where: {
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        shopping_mall_customer_id: props.customer.id,
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException("Review already exists", 409);
    }
    return await prisma.shopping_mall_reviews.create({
      data: await ShoppingMallReviewCollector.collect({
        body: props.body,
        customer: props.customer,
      }),
    });
  });
  const result = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: review.id },
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(result);
}
