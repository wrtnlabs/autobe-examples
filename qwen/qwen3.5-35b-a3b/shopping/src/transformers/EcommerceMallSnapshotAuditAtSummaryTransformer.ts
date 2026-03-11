import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSnapshotAuditAtSummaryTransformer {
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
  ): Promise<IEcommerceMallSnapshotAudit.ISummary> {
    return {
      id: input.id,
      record_type: typia.assert<
        | "product"
        | "product_variant"
        | "seller_profile"
        | "order_item"
        | "review"
        | "cancellation_request"
        | "refund_request"
      >(input.record_type),
      record_id: input.record_id,
      changed_at: input.changed_at.toISOString(),
      changed_by: {
        id: input.changed_by,
        email: "",
      } as IEcommerceMallCustomer.ISummary,
    };
  }
}
