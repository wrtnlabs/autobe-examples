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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Validate customer owns the refund request
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Build filter criteria from props.body
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.created_at_before && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.status_before && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after && { status_after: props.body.status_after }),
  };
  // Determine pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Determine sorting with lowercase order
  const orderByInput = (
    props.body.sort_by === "action_type"
      ? { action_type: (props.body.sort_order ?? "DESC") as "asc" | "desc" }
      : props.body.sort_by === "actor_type"
        ? { actor_type: (props.body.sort_order ?? "DESC") as "asc" | "desc" }
        : { created_at: (props.body.sort_order ?? "DESC") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  // Query snapshots
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        refund_request_id: true,
        actor_type: true,
        action_type: true,
        status_before: true,
        status_after: true,
        reason_before: true,
        reason_after: true,
        response_before: true,
        response_after: true,
        metadata_before: true,
        metadata_after: true,
        created_at: true,
        deleted_at: true,
      } satisfies Prisma.ecommerce_mall_refund_request_snapshotsSelect,
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform to DTO format
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id,
        refundRequestId: snapshot.refund_request_id,
        actorType: typia.assert<
          "customer" | "seller" | "admin" | "super_admin"
        >(snapshot.actor_type),
        actionType: typia.assert<
          | "created"
          | "status_changed"
          | "approved"
          | "rejected"
          | "response_added"
        >(snapshot.action_type),
        statusBefore: snapshot.status_before,
        statusAfter: snapshot.status_after,
        reasonBefore: snapshot.reason_before,
        reasonAfter: snapshot.reason_after,
        responseBefore: snapshot.response_before,
        responseAfter: snapshot.response_after,
        metadataBefore: snapshot.metadata_before,
        metadataAfter: snapshot.metadata_after,
        createdAt: snapshot.created_at.toISOString(),
        deletedAt: snapshot.deleted_at?.toISOString() ?? null,
      }) satisfies IEcommerceMallRefundRequestSnapshot.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallRefundRequestSnapshot.ISummary;
}
