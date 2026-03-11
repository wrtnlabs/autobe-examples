import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderAtItemStatusHistoryTransformer {
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
  ): Promise<IEcommerceMallOrder.IItemStatusHistory> {
    const newValues = JSON.parse(input.new_values);
    const oldValues = JSON.parse(input.old_values);
    const changes = JSON.parse(input.changes) as any[];
    const statusHistory = (await ArrayUtil.asyncMap(changes, async (audit) => {
      const auditNewValues = JSON.parse(audit.new_values);
      const auditOldValues = JSON.parse(audit.old_values);
      return {
        oldStatus: auditOldValues?.item_status ?? null,
        newStatus: auditNewValues?.item_status ?? null,
        changedAt: toISOStringSafe(audit.changed_at),
        changedBy: audit.changed_by,
      };
    })) as IEcommerceMallOrder.IStatusHistoryEntry[];
    return {
      id: input.record_id,
      product: newValues.product || null,
      variant: newValues.variant || null,
      quantity: newValues.quantity,
      unitPrice: newValues.unit_price,
      itemStatus: newValues.item_status,
      statusHistory,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
