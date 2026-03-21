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
    ecommerceMallProductVariants: IEntity;
  }) {
    const id: string = v4();
    // Determine sign for quantity_change based on operation type
    // 'restock' adds inventory (positive), 'adjust' removes inventory (negative)
    const quantityChange: number =
      props.body.operation === "restock"
        ? props.body.quantity
        : -props.body.quantity;
    return {
      // Scalar fields
      id,
      quantity_change: quantityChange,
      reason: props.body.reason,
      created_at: new Date(),
      // BelongsTo relation (required FK)
      productVariant: {
        connect: { id: props.ecommerceMallProductVariants.id },
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
  }
}
