import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
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
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequestId: input.refundRequest.id,
      actorType: typia.assert<"customer" | "seller" | "admin" | "super_admin">(
        input.actor_type,
      ),
      actionType: typia.assert<
        | "approved"
        | "rejected"
        | "created"
        | "status_changed"
        | "reason_updated"
        | "response_added"
      >(input.action_type),
      statusBefore: typia.assert<
        "pending" | "approved" | "rejected" | "refunded" | null | undefined
      >(input.status_before),
      statusAfter: typia.assert<
        "pending" | "approved" | "rejected" | "refunded" | null | undefined
      >(input.status_after),
      reasonBefore: input.reason_before,
      reasonAfter: input.reason_after,
      responseBefore: input.response_before,
      responseAfter: input.response_after,
      metadataBefore: input.metadata_before,
      metadataAfter: input.metadata_after,
      createdAt: toISOStringSafe(input.created_at),
      deletedAt:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
    };
  }
}
