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

export async function patchEcommerceMallCustomerRefundRequestSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where conditions based on filters
  const whereConditions: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput[] =
    [];
  // Filter by customer - customers can only view their own snapshots
  whereConditions.push({
    ecommerce_mall_customer_id: props.customer.id,
  });
  // Filter by snapshot_status
  if (props.body.snapshot_status) {
    whereConditions.push({
      snapshot_status: props.body.snapshot_status,
    });
  }
  // Filter by seller_response
  if (props.body.seller_response) {
    whereConditions.push({
      seller_response: props.body.seller_response,
    });
  }
  // Filter by date range (startDate and endDate)
  if (props.body.startDate || props.body.endDate) {
    const dateFilter: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (props.body.startDate) {
      dateFilter.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate) {
      dateFilter.lte = new Date(props.body.endDate);
    }
    whereConditions.push({
      created_at: dateFilter,
    });
  }
  // Combine all conditions with AND
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  // Determine sort field and order
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder =
    props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
  // Build orderBy
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  // Query database with filters and pagination
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform data using transformer
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
