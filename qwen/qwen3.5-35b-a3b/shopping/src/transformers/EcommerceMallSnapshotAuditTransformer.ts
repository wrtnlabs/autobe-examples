import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSnapshotAuditTransformer {
  export type Payload = Prisma.ecommerce_mall_snapshot_auditsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        record_type: true,
        record_id: true,
        changes: true,
        old_values: true,
        new_values: true,
        changed_at: true,
        changed_by: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_snapshot_auditsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSnapshotAudit> {
    return {
      id: input.id,
      recordType: typia.assert<
        | "product"
        | "product_variant"
        | "seller_profile"
        | "order_item"
        | "review"
        | "cancellation_request"
        | "refund_request"
      >(input.record_type),
      recordId: input.record_id,
      changes: JSON.parse(input.changes),
      oldValues: JSON.parse(input.old_values),
      newValues: JSON.parse(input.new_values),
      changedAt: toISOStringSafe(input.changed_at),
      changedBy: input.changed_by,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
