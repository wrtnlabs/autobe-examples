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
    ecommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
        where: { id: props.body.ecommerce_mall_product_variant_id },
      });
    const remaining_quantity: number =
      (variant.stock_quantity ?? 0) + props.body.quantity_change;
    return {
      id,
      quantity_change: props.body.quantity_change,
      remaining_quantity,
      reason: props.body.reason,
      type: props.body.type,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      variant: {
        connect: { id: props.body.ecommerce_mall_product_variant_id },
      },
      order: undefined,
      cancellationRequest: undefined,
      refundRequest: undefined,
    } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
  }
}
