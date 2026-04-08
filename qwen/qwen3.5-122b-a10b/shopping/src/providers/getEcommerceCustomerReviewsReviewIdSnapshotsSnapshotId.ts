import { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewSnapshotTransformer } from "../transformers/EcommerceReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_review_id: props.reviewId,
        review: {
          customer_id: props.customer.id,
        },
      },
      ...EcommerceReviewSnapshotTransformer.select(),
    });
  return await EcommerceReviewSnapshotTransformer.transform(snapshot);
}
