import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewReviewSnapshot> {
  const review =
    await MyGlobal.prisma.shopping_mall_review_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: { id: true, shopping_mall_customer_id: true },
    });
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_review_review_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_review_review_id: props.reviewId,
        },
        ...ShoppingMallReviewReviewSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallReviewReviewSnapshotTransformer.transform(record);
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
// import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallReviewReviewSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_review_review_snapshots.findFirstOrThrow({
//     ...ShoppingMallReviewReviewSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallReviewReviewSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------