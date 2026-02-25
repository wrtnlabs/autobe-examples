import { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceModificationInventoryRestorationAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_modification_inventory_restorationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_restored: true,
        restoration_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_cancellation_requestsFindManyArgs,
        refundRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_refund_requestsFindManyArgs,
        inventoryRecord: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_inventory_recordsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_modification_inventory_restorationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceModificationInventoryRestoration.ISummary> {
    return {
      id: input.id,
      quantity_restored: input.quantity_restored,
      restoration_reason: input.restoration_reason,
      created_at: input.created_at.toISOString(),
      ecommerce_cancellation_request_id: input.cancellationRequest?.id ?? null,
      ecommerce_refund_request_id: input.refundRequest?.id ?? null,
      ecommerce_inventory_record_id: input.inventoryRecord.id,
    };
  }
}
