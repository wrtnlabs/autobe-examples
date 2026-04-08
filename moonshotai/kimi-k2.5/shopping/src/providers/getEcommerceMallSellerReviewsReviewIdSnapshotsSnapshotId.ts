import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerReviewsReviewIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  reviewId: string;
  snapshotId: string;
}): Promise<IEcommerceMallReviewSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findFirstOrThrow({
      ...EcommerceMallReviewSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_mall_review_id: props.reviewId,
      },
    });
  return await EcommerceMallReviewSnapshotTransformer.transform(record);
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
// export async function getEcommerceMallSellerReviewsReviewIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
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