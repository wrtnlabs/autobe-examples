import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_mall_review_id: props.reviewId,
      },
      select: {
        id: true,
        ecommerce_mall_review_id: true,
        rating: true,
        content: true,
        created_at: true,
        review: {
          select: {
            customer_id: true,
          },
        },
      } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs["select"],
    });
  if (record.review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    reviewId: record.ecommerce_mall_review_id,
    rating: record.rating,
    content: record.content,
    createdAt: record.created_at.toISOString(),
  } satisfies IEcommerceMallReviewSnapshot;
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
// import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   reviewId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallReviewSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirstOrThrow({
//     ...EcommerceMallReviewSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallReviewSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------