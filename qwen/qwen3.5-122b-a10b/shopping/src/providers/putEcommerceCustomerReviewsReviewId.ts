import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewTransformer } from "../transformers/EcommerceReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReview.IUpdate;
}): Promise<IEcommerceReview> {
  const review = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      deleted_at: true,
      rating: true,
      content: true,
    },
  });
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.ecommerce_review_snapshots.create({
    data: {
      id: v4(),
      ecommerce_review_id: props.reviewId,
      rating: review.rating,
      content: review.content,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.ecommerce_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating,
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    ...EcommerceReviewTransformer.select(),
  });
  return await EcommerceReviewTransformer.transform(updated);
}
