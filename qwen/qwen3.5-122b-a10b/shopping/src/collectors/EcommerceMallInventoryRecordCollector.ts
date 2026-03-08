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
    // Query existing inventory records for this variant to calculate current stock
    const existingRecords =
      await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
        where: {
          ecommerce_mall_product_variant_id:
            props.ecommerceMallProductVariants.id,
          deleted_at: null,
        },
        select: {
          quantity_change: true,
        },
      });
    const currentStock =
      existingRecords.reduce((sum, record) => sum + record.quantity_change, 0) +
      props.body.quantityChange;
    return {
      id,
      quantity_change: props.body.quantityChange,
      reason: props.body.reason,
      recorded_at: new Date(),
      current_stock: currentStock,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: {
        connect: { id: props.ecommerceMallProductVariants.id },
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
  }
}
