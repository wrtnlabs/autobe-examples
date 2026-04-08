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
import { EcommerceMallReviewAtInvertTransformer } from "../transformers/EcommerceMallReviewAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReview.IInvert> {
  // Authorization: fetch ecommerce_mall_review_id first, then get the review's customer_id
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirst({
      select: {
        ecommerce_mall_review_id: true,
      },
      where: {
        id: props.snapshotId,
        ecommerce_mall_review_id: props.reviewId,
      },
    });
  // Fetch the review to get ecommerce_mall_customer_id for authorization
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    select: {
      ecommerce_mall_customer_id: true,
    },
    where: {
      id: snapshot!.ecommerce_mall_review_id,
    },
  });
  if (
    props.customer.type === "customer" &&
    review!.ecommerce_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Main query with transformer
  const record =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirstOrThrow({
      ...EcommerceMallReviewAtInvertTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_mall_review_id: props.reviewId,
      },
    });
  return await EcommerceMallReviewAtInvertTransformer.transform(record);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallReview.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirstOrThrow({
//     ...EcommerceMallReviewAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallReviewAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------