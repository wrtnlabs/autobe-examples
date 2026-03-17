import { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminApprovalRequestsApprovalRequestIdSnapshots(props: {
  admin: AdminPayload;
  approvalRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApprovalSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalSnapshot.ISummary> {
  // Validate approvalRequestId exists in ecommerce_mall_seller_approval_requests
  await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow(
    {
      where: { id: props.approvalRequestId },
    },
  );
  // Build search filters from request body
  const whereInput: Prisma.ecommerce_mall_seller_approval_snapshotsWhereInput =
    {
      ecommerce_mall_seller_approval_request_id: props.approvalRequestId,
      ...(props.body.from_status !== undefined && {
        from_status: props.body.from_status,
      }),
      ...(props.body.to_status !== undefined && {
        to_status: props.body.to_status,
      }),
      ...(props.body.actor_type !== undefined && {
        actor_type: props.body.actor_type,
      }),
      ...(props.body.rejection_reason_exists !== undefined && {
        rejection_reason: props.body.rejection_reason_exists
          ? { not: null }
          : { equals: null },
      }),
      ...(props.body.start_time !== undefined && {
        created_at: {
          gte: new Date(props.body.start_time),
        },
      }),
      ...(props.body.end_time !== undefined && {
        created_at: {
          lte: new Date(props.body.end_time),
        },
      }),
    } satisfies Prisma.ecommerce_mall_seller_approval_snapshotsWhereInput;
  // Build sort input from request body
  const orderByInput = (
    props.body.sort_by === "from_status"
      ? [{ from_status: props.body.sort === "asc" ? "asc" : "desc" }]
      : props.body.sort_by === "to_status"
        ? [{ to_status: props.body.sort === "asc" ? "asc" : "desc" }]
        : [{ created_at: props.body.sort === "asc" ? "asc" : "desc" }]
  ) satisfies Prisma.ecommerce_mall_seller_approval_snapshotsOrderByWithRelationInput[];
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch paginated data with transformer select
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallSellerApprovalSnapshotAtSummaryTransformer.select(),
    });
  // Fetch total count for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_snapshots.count({
      where: whereInput,
    });
  // Transform data and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerApprovalSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
