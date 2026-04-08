import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberReviewsReviewId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // Fetch review with all relations for response
  const record = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    },
  );
  // Verify review is not soft-deleted
  if (record.deleted_at !== null) {
    throw new HttpException("Review is soft-deleted", 409);
  }
  // Verify ownership
  if (record.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create snapshot for audit trail before update
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      review: { connect: { id: props.reviewId } },
      product: { connect: { id: record.product.id } },
      orderItem: { connect: { id: record.orderItem.id } },
      version: 0,
      rating: record.rating,
      review_text: record.review_text,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Build update data with conditional fields
  const updateData: Prisma.ecommerce_mall_reviewsUpdateInput = {
    ...(props.body.rating !== undefined && { rating: props.body.rating }),
    ...(props.body.review_text !== undefined && {
      review_text: props.body.review_text,
    }),
    updated_at: new Date(),
  };
  // Update the review
  const updated = await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
    ...EcommerceMallReviewTransformer.select(),
  });
  return await EcommerceMallReviewTransformer.transform(updated);
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberReviewsReviewId(props: {
//   member: MemberPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IEcommerceMallReview.IUpdate;
// }): Promise<IEcommerceMallReview> {
//   const record = await MyGlobal.prisma.ecommerce_mall_reviews.findFirstOrThrow({
//     ...EcommerceMallReviewTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------