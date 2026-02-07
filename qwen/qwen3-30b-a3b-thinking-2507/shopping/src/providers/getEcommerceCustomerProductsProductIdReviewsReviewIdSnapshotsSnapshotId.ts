import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceProductReviewSnapshotTransformer } from "../transformers/EcommerceProductReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerProductsProductIdReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_product_review_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...EcommerceProductReviewSnapshotTransformer.select(),
    });
  if (!snapshot) throw new HttpException("Snapshot not found", 404);
  if (snapshot.review.id !== props.reviewId)
    throw new HttpException("Review ID mismatch", 404);
  if (snapshot.review.product.id !== props.productId)
    throw new HttpException("Product ID mismatch", 404);
  return await EcommerceProductReviewSnapshotTransformer.transform(snapshot);
}
