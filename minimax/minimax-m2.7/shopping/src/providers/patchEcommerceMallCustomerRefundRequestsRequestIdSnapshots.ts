import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Step 1: Verify refund request exists and belongs to the customer (authorization)
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
      },
    });
  // Authorization: Customer can only view their own refund request snapshots
  if (refundRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Step 3: Build where clause with filters
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    ecommerce_mall_refund_request_id: props.requestId,
    ...(props.body.snapshot_status && {
      snapshot_status: props.body.snapshot_status,
    }),
    ...(props.body.seller_response && {
      seller_response: props.body.seller_response,
    }),
    ...(props.body.startDate || props.body.endDate
      ? {
          created_at: {
            ...(props.body.startDate && {
              gte: new Date(props.body.startDate as string),
            }),
            ...(props.body.endDate && {
              lte: new Date(props.body.endDate as string),
            }),
          },
        }
      : {}),
  };
  // Step 4: Build orderBy clause
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  // Step 5: Execute queries (sequential, not parallel)
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Step 6: Transform and return paginated results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
