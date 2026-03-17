import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
  const orderItemId = typia.assert<string & tags.Format<"uuid">>(
    props.body.order_item_id,
  );
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: orderItemId },
      select: {
        id: true,
        order_id: true,
        product_id: true,
        status: true,
        order: {
          select: {
            customer_id: true,
          },
        },
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Cannot review order items from another customer's order",
      403,
    );
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Can only review delivered order items", 400);
  }
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: { order_item_id: orderItemId },
    });
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  const createPayload = await EcommerceMallReviewCollector.collect({
    body: props.body,
    ecommerceMallCustomers: { id: props.customer.id },
    ecommerceMallOrderItems: { id: orderItemId },
  });
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: createPayload,
  });
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: created.id },
      ...EcommerceMallReviewTransformer.select(),
    },
  );
  return await EcommerceMallReviewTransformer.transform(review);
}
