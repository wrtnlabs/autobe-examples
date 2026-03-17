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

export async function patchEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100);
  // Validate customer owns the refund request
  await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
    where: {
      id: props.refundRequestId,
      ecommerce_mall_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Build where clause for filters
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    deleted_at: null,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.status_before !== undefined && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after !== undefined && {
      status_after: props.body.status_after,
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
  };
  // Build order by clause
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput[] =
    [
      {
        created_at: props.body.sort_order === "ASC" ? "asc" : "desc",
      },
    ] satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput[];
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  // Query snapshots with transformer select
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestSnapshotTransformer.transform,
  );
  // Calculate pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData as any,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallRefundRequestSnapshot.ISummary;
}
