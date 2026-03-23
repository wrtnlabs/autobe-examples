import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: { id: true, orderItem: { select: { seller_id: true } } },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.orderItem?.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: { refund_request_id: props.refundRequestId },
    });
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: { refund_request_id: props.refundRequestId },
      orderBy: { created_at: "asc" },
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallRefundRequestSnapshotTransformer.transform,
  );
  return {
    data: data,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: total === 0 ? 0 : 1,
    } satisfies IPage.IPagination,
  };
}
