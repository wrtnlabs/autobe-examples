import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function postEcommerceMallCustomerProductsProductIdReviews(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.body.order_item_id,
        bbs_user_id: props.customer.id,
        item_status: "delivered",
      },
      select: { id: true, product_id: true },
    });
  if (orderItem.product_id !== props.productId) {
    throw new HttpException("Order item product does not match", 400);
  }
  const existing = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      customer_id: props.customer.id,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Review already exists for this product", 409);
  }
  const data = await EcommerceMallReviewCollector.collect({
    body: props.body,
    ecommerceMallCustomers: { id: props.customer.id } as IEntity,
    ecommerceMallOrderItems: { id: orderItem.id } as IEntity,
  });
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data,
    ...EcommerceMallReviewTransformer.select(),
  });
  const transformed = await EcommerceMallReviewTransformer.transform(created);
  return transformed;
}
