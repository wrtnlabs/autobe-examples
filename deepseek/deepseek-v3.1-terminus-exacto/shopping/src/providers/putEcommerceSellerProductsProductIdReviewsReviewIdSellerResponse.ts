import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceReviewResponseTransformer } from "../transformers/EcommerceReviewResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewResponse.IUpdate;
}): Promise<IEcommerceReviewResponse> {
  // Validate review exists and belongs to specified product
  await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      product: { id: props.productId },
    },
  });
  // Find existing response and verify seller ownership
  const existingResponse =
    await MyGlobal.prisma.ecommerce_review_responses.findUniqueOrThrow({
      where: { ecommerce_review_id: props.reviewId },
      select: { id: true, seller_id: true },
    });
  // Authorization check - seller must own the response
  if (existingResponse.seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only update your own review responses",
      403,
    );
  }
  // Update response body and timestamp
  await MyGlobal.prisma.ecommerce_review_responses.update({
    where: { id: existingResponse.id },
    data: {
      body: props.body.body,
      updated_at: new Date(),
    },
  });
  // Fetch complete updated response with nested relations
  const updated =
    await MyGlobal.prisma.ecommerce_review_responses.findUniqueOrThrow({
      where: { id: existingResponse.id },
      ...EcommerceReviewResponseTransformer.select(),
    });
  return await EcommerceReviewResponseTransformer.transform(updated);
}
