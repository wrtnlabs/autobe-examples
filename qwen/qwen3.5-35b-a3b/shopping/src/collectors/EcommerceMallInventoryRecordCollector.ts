import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallInventoryRecordCollector {
  export async function collect(props: {
    body: IEcommerceMallInventoryRecord.ICreate;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    const created_at: Date = new Date();
    // Query variant to get current inventory level for remaining_quantity calculation
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.ecommerce_mall_product_variant_id },
        select: {
          stock_quantity: true,
          reserved_quantity: true,
        },
      });
    const remaining_quantity: number =
      variant.stock_quantity -
      variant.reserved_quantity +
      props.body.quantity_change;
    return {
      id,
      quantity_change: props.body.quantity_change,
      remaining_quantity,
      reason: props.body.reason,
      type: props.body.type,
      description: props.body.description ?? null,
      created_at: created_at.toISOString(),
      updated_at: created_at.toISOString(),
      deleted_at: null,
      variant: {
        connect: { id: props.body.ecommerce_mall_product_variant_id },
      },
      order: undefined,
      cancellationRequest: undefined,
      refundRequest: undefined,
      snapshots: { create: [] },
    } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
  }
}
