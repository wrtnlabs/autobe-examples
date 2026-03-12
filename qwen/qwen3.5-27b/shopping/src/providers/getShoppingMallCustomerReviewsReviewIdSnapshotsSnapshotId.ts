import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  const snapshotData = JSON.parse(snapshot.snapshot_data) as {
    shopping_customer_id: string;
  };
  if (snapshotData.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
