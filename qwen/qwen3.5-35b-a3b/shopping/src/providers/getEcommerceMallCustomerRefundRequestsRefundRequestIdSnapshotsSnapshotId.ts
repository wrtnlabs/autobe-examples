import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
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
          refundRequest: {
            select: {
              id: true,
              ecommerce_mall_customer_id: true,
            },
          } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
          customerSnapshots: {
            select: {
              id: true,
            },
          } satisfies Prisma.ecommerce_mall_refund_request_snapshot_of_customersFindManyArgs,
          sellerSnapshot: {
            select: {
              id: true,
            },
          } satisfies Prisma.ecommerce_mall_refund_request_snapshot_of_sellersFindManyArgs,
          adminSubtype: {
            select: {
              id: true,
            },
          } satisfies Prisma.ecommerce_mall_refund_request_snapshot_of_adminsFindManyArgs,
          ofSuperAdmin: {
            select: {
              id: true,
            },
          } satisfies Prisma.ecommerce_mall_refund_request_snapshot_of_super_adminsFindManyArgs,
        },
      },
    );
  if (snapshot.refund_request_id !== props.refundRequestId) {
    throw new HttpException(
      "Snapshot does not belong to the specified refund request",
      400,
    );
  }
  const refundRequest = snapshot.refundRequest;
  if (refundRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallRefundRequestSnapshotTransformer.transform({
    id: snapshot.id,
    actor_type: snapshot.actor_type,
    action_type: snapshot.action_type,
    status_before: snapshot.status_before,
    status_after: snapshot.status_after,
    reason_before: snapshot.reason_before,
    reason_after: snapshot.reason_after,
    response_before: snapshot.response_before,
    response_after: snapshot.response_after,
    metadata_before: snapshot.metadata_before,
    metadata_after: snapshot.metadata_after,
    created_at: snapshot.created_at,
    deleted_at: snapshot.deleted_at,
    refundRequest: {
      id: refundRequest.id,
    },
    customerSnapshots: snapshot.customerSnapshots,
    sellerSnapshot: snapshot.sellerSnapshot,
    adminSubtype: snapshot.adminSubtype,
    ofSuperAdmin: snapshot.ofSuperAdmin,
  });
}
