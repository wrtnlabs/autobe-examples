import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductReviewCollector } from "../collectors/EcommerceProductReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerProductsProductId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductReview.ICreate;
}): Promise<IEcommerceProductReview> {
  // Create review using collector
  const created = await MyGlobal.prisma.ecommerce_product_reviews.create({
    data: await EcommerceProductReviewCollector.collect({
      body: props.body,
      ecommerceProducts: { id: props.productId },
      ecommerceCustomers: { id: props.customer.id },
    }),
  });
  // Return transformed response
  return {
    id: created.id,
    rating: created.rating,
    comment: created.comment === null ? undefined : created.comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    product_id: created.product_id,
    customer_id: created.customer_id,
  };
}
