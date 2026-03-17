import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestSnapshotTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerCancellationRequestSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // Step 1: Verify seller ownership before full data fetch
  const ownershipCheck =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          cancellationRequest: {
            select: {
              orderItem: {
                select: {
                  shopping_mall_seller_id: true,
                },
              },
            },
          },
        },
      },
    );
  if (
    ownershipCheck.cancellationRequest.orderItem.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch full data with transformer
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
