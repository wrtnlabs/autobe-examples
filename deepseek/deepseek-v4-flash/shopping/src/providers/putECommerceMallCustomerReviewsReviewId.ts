import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallReviewTransformer } from "../transformers/ECommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IECommerceMallReview.IUpdate;
}): Promise<IECommerceMallReview> {
  const review = await MyGlobal.prisma.e_commerce_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      rating: true,
      content: true,
      e_commerce_mall_customer_id: true,
      deleted_at: true,
    },
  });
  if (review === null || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  if (review.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const hasRatingChange: boolean = props.body.rating !== undefined;
  const hasContentChange: boolean = props.body.content !== undefined;
  if (hasRatingChange === false && hasContentChange === false) {
    const unchanged =
      await MyGlobal.prisma.e_commerce_mall_reviews.findUniqueOrThrow({
        where: { id: props.reviewId },
        ...ECommerceMallReviewTransformer.select(),
      });
    return await ECommerceMallReviewTransformer.transform(unchanged);
  }
  const changedFields: string =
    hasRatingChange && hasContentChange
      ? "rating_and_text"
      : hasRatingChange
        ? "rating"
        : "text";
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.e_commerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      e_commerce_mall_review_id: review.id,
      rating: review.rating,
      text: review.content,
      changed_fields: changedFields,
      created_at: now,
    },
  });
  await MyGlobal.prisma.e_commerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(hasRatingChange && { rating: props.body.rating }),
      ...(hasContentChange && { content: props.body.content }),
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.e_commerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...ECommerceMallReviewTransformer.select(),
    });
  return await ECommerceMallReviewTransformer.transform(updated);
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
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallCustomerReviewsReviewId(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IECommerceMallReview.IUpdate;
// }): Promise<IECommerceMallReview> {
//   await MyGlobal.prisma.e_commerce_mall_reviews.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_reviews.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallReviewTransformer.select(),
//   });
//   return await ECommerceMallReviewTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------