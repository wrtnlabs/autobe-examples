import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        refundRequest: { select: { id: true } },
        customerSnapshots: true,
        sellerSnapshot: true,
        adminSubtype: true,
        ofSuperAdmin: true,
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
      statusBefore:
        input.status_before === undefined || input.status_before === null
          ? undefined
          : typia.assert<
              | "pending"
              | "approved"
              | "rejected"
              | "refunded"
              | null
              | undefined
            >(input.status_before),
      statusAfter:
        input.status_after === undefined || input.status_after === null
          ? undefined
          : typia.assert<
              | "pending"
              | "approved"
              | "rejected"
              | "refunded"
              | null
              | undefined
            >(input.status_after),
      reasonBefore: input.reason_before ?? undefined,
      reasonAfter: input.reason_after ?? undefined,
      responseBefore: input.response_before ?? undefined,
      responseAfter: input.response_after ?? undefined,
      metadataBefore: input.metadata_before ?? undefined,
      metadataAfter: input.metadata_after ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
