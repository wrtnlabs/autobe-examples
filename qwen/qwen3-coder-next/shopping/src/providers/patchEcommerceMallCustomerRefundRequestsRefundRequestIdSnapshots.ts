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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot> {
  // Check customer can view this refund request
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { id: true, customer_id: true },
    });
  if (refundRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query snapshots filtered by refund request ID, ordered chronologically
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: {
        refund_request_id: props.refundRequestId,
      },
      orderBy: {
        created_at: "asc",
      },
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  // Transform all snapshots to response DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallRefundRequestSnapshotTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: data.length === 0 ? 0 : 1,
    } satisfies IPage.IPagination,
  };
}
