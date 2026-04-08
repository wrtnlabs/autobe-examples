import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  refundRequestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallRefundRequestSnapshotTransformer.select(),
      },
    );
  // Verify the snapshot belongs to the specified refund request
  if (snapshot.refundRequest.id !== props.refundRequestId) {
    throw new HttpException("Snapshot not found for this refund request", 404);
  }
  // Verify the seller owns the refund request (via order item)
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        orderItem: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (refundRequest.orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return EcommerceMallRefundRequestSnapshotTransformer.transform(snapshot);
}
