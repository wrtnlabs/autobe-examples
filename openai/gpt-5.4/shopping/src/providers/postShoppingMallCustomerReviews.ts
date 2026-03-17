import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
  if (props.body.rating < 1 || props.body.rating > 5)
    throw new HttpException("Rating must be between 1 and 5", 400);
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const order = await prisma.shopping_mall_orders.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_order_id,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
      },
    });
    if (order.shopping_mall_customer_id !== props.customer.id)
      throw new HttpException("Forbidden", 403);
    if (order.deleted_at !== null)
      throw new HttpException("Order is not available for review", 400);
    const orderItem = await prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_order_item_id,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        status: true,
        delivered_at: true,
        deleted_at: true,
      },
    });
    if (orderItem.shopping_mall_order_id !== order.id)
      throw new HttpException("Order item does not belong to the order", 400);
    if (orderItem.deleted_at !== null)
      throw new HttpException("Order item is not available for review", 400);
    if (orderItem.status !== "delivered" || orderItem.delivered_at === null)
      throw new HttpException(
        "Review is allowed only for delivered items",
        400,
      );
    const variant =
      await prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: {
          id: orderItem.shopping_mall_product_variant_id,
        },
        select: {
          id: true,
          shopping_mall_product_id: true,
          deleted_at: true,
        },
      });
    if (variant.deleted_at !== null)
      throw new HttpException("Order item is not available for review", 400);
    if (
      variant.shopping_mall_product_id !== props.body.shopping_mall_product_id
    )
      throw new HttpException("Order item does not match the product", 400);
    const product = await prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_product_id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (product.deleted_at !== null)
      throw new HttpException("Product is not available for review", 400);
    const existing = await prisma.shopping_mall_reviews.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        shopping_mall_order_id: props.body.shopping_mall_order_id,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null)
      throw new HttpException(
        "Review already exists for this product in the order",
        409,
      );
    const created = await prisma.shopping_mall_reviews.create({
      data: await ShoppingMallReviewCollector.collect({
        body: props.body,
        customer: props.customer,
      }),
      ...ShoppingMallReviewTransformer.select(),
    });
    return await ShoppingMallReviewTransformer.transform(created);
  });
}
