import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorRefundRequestsRefundRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceRefundRequestSnapshot.ISummary> {
  // Validate refund request exists (preserves authorization integrity)
  await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId },
  });
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build where clause with proper null handling
  const whereInput = {
    ecommerce_refund_request_id: props.refundRequestId,
    ...(props.body.modifying_customer_id !== undefined && {
      modifying_customer_id:
        props.body.modifying_customer_id === null
          ? null
          : props.body.modifying_customer_id,
    }),
    ...(props.body.modifying_seller_id !== undefined && {
      modifying_seller_id:
        props.body.modifying_seller_id === null
          ? null
          : props.body.modifying_seller_id,
    }),
    ...(props.body.modifying_administrator_id !== undefined && {
      modifying_administrator_id:
        props.body.modifying_administrator_id === null
          ? null
          : props.body.modifying_administrator_id,
    }),
  } satisfies Prisma.ecommerce_refund_request_snapshotsWhereInput;
  // Add date range filtering without Date constructor
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    const dateFilter: any = {};
    if (props.body.created_at_start !== undefined) {
      dateFilter.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end !== undefined) {
      dateFilter.lte = props.body.created_at_end;
    }
    (whereInput as any).created_at = dateFilter;
  }
  // Determine sort field and order
  const sortField =
    props.body.sort_by === "refund_request_id"
      ? "ecommerce_refund_request_id"
      : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_refund_request_snapshotsOrderByWithRelationInput;
  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceRefundRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_refund_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
