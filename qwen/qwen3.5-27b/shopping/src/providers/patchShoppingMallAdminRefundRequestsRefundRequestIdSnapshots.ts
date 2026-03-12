import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallRefundSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundSnapshot.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Extract sorting parameters with defaults
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Verify the refund request exists (admin can access any refund request)
  await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
    where: {
      id: props.refundRequestId,
    },
  });
  // Build order by clause
  const orderByInput = (
    sortOrder === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_refund_snapshotsOrderByWithRelationInput;
  // Query snapshots with pagination
  const data = await MyGlobal.prisma.shopping_mall_refund_snapshots.findMany({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallRefundSnapshotAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_refund_snapshots.count({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallRefundSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
