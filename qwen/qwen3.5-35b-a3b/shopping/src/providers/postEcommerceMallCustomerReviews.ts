import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.body.order_id },
    select: { status: true, deleted_at: true },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order is deleted", 400);
  }
  if (order.status !== "delivered") {
    throw new HttpException(
      "Cannot create review for non-delivered order",
      400,
    );
  }
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existingReview !== null) {
    throw new HttpException(
      "Customer already has a review for this product",
      409,
    );
  }
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: {
      id: v4(),
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
      order: { connect: { id: props.body.order_id } },
      rating: props.body.rating,
      title: props.body.title ?? null,
      body: props.body.body,
      is_verified_purchase: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceMallReviewTransformer.select(),
  });
  return await EcommerceMallReviewTransformer.transform(created);
}
