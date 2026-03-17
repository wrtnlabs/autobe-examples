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
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          deleted_at: null,
        },
        ...EcommerceMallRefundRequestSnapshotTransformer.select(),
      },
    );
  if (snapshot.refundRequest.id !== props.refundRequestId) {
    throw new HttpException("Not Found", 404);
  }
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: snapshot.refundRequest.id,
        deleted_at: null,
      },
    });
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: {
        id: refundRequest.ecommerce_mall_order_item_id,
      },
    });
  if (orderItem.seller_snapshot_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallRefundRequestSnapshotTransformer.transform(
    snapshot,
  );
}
