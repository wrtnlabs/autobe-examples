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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersSellerIdRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  sellerId: string;
  refundRequestId: string;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify refund request exists and get seller_id for authorization
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
  // Authorization: Only seller who fulfilled the order item or admin can access
  if (refundRequest.orderItem.seller_id !== props.sellerId) {
    throw new HttpException("Forbidden", 403);
  }
  // Use defaults for pagination since props.body doesn't exist
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: {
        refund_request_id: props.refundRequestId,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: {
        refund_request_id: props.refundRequestId,
      },
    });
  // Transform to response DTO
  const data: IEcommerceMallRefundRequestSnapshot.ISummary[] = snapshots.map(
    (snapshot) => ({
      id: snapshot.id as string & tags.Format<"uuid">,
      snapshot_type: snapshot.snapshot_type,
      reason: snapshot.reason,
      status: snapshot.status,
      responded_at: snapshot.responded_at
        ? toISOStringSafe(snapshot.responded_at)
        : null,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallRefundRequestSnapshot.ISummary;
}
