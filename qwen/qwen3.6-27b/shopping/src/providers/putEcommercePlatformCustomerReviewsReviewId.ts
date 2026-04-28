import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformReviewTransformer } from "../transformers/EcommercePlatformReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommercePlatformReview.IUpdate;
}): Promise<IEcommercePlatformReview> {
  const review =
    await MyGlobal.prisma.ecommerce_platform_reviews.findUniqueOrThrow({
      where: {
        id: props.reviewId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_platform_customer_id: true,
        rating: true,
        text_content: true,
      },
    });
  if (review.ecommerce_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const newRating = props.body.rating ?? review.rating;
  const newContent =
    props.body.text_content === undefined
      ? review.text_content
      : props.body.text_content;
  const snapshot = await MyGlobal.prisma.ecommerce_platform_snapshots.create({
    data: {
      id: v4(),
      entity_type: "review",
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.ecommerce_platform_snapshot_reviews.create({
    data: {
      id: v4(),
      ecommerce_platform_snapshot_id: snapshot.id,
      ecommerce_platform_review_id: props.reviewId,
      previous_rating: review.rating,
      previous_content: review.text_content,
      new_rating: newRating,
      new_content: newContent,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.ecommerce_platform_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommercePlatformReviewTransformer.select(),
    });
  return await EcommercePlatformReviewTransformer.transform(updated);
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
// import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformCustomerReviewsReviewId(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformReview.IUpdate;
// }): Promise<IEcommercePlatformReview> {
//   await MyGlobal.prisma.ecommerce_platform_reviews.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_reviews.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformReviewTransformer.select(),
//   });
//   return await EcommercePlatformReviewTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------