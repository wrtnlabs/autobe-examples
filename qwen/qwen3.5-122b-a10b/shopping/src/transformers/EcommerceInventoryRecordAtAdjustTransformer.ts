import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceInventoryRecordAtAdjustTransformer {
  export type Payload = Prisma.ecommerce_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceInventoryRecord.IAdjust> {
    return {
      quantity_change: input.quantity_change,
      reason: input.reason,
    } satisfies IEcommerceInventoryRecord.IAdjust;
  }
}
