import { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceInventoryCollector {
  export async function collect(props: {
    body: IEcommerceInventory.ICreate;
    ecommerceProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      variant: { connect: { id: props.ecommerceProductVariants.id } },
    } satisfies Prisma.ecommerce_inventoriesCreateInput;
  }
}
