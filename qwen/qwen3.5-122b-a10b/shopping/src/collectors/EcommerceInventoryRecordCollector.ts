import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceInventoryRecordCollector {
  export async function collect(props: {
    body: IEcommerceInventoryRecord.ICreate;
    ecommerceProductVariants: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: { connect: { id: props.ecommerceProductVariants.id } },
    } satisfies Prisma.ecommerce_inventory_recordsCreateInput;
  }
}
