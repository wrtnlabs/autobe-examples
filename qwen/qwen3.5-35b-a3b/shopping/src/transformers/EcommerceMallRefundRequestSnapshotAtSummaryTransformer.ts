import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestSnapshotAtSummaryTransformer {
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
        refundRequest: true,
        customerSnapshots: true,
        sellerSnapshot: true,
        adminSubtype: true,
        ofSuperAdmin: true,
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot.ISummary> {
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
        | "response_added"
      >(input.action_type),
      statusBefore: input.status_before ?? null,
      statusAfter: input.status_after ?? null,
      reasonBefore: input.reason_before ?? null,
      reasonAfter: input.reason_after ?? null,
      responseBefore: input.response_before ?? null,
      responseAfter: input.response_after ?? null,
      metadataBefore: input.metadata_before ?? null,
      metadataAfter: input.metadata_after ?? null,
      createdAt: toISOStringSafe(input.created_at),
      deletedAt:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
