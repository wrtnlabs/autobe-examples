import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallInventoryRecordCollector {
  export async function collect(props: {
    body: IShoppingMallInventoryRecord.ICreate;
    shoppingMallProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      variant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallInventoryRecordCollector {
//         export async function collect(props: {
//           body: IShoppingMallInventoryRecord.ICreate;
//           shoppingMallProductVariants: IEntity; // from path parameter variantId
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity_change: ...,
//       reason: ...,
//       created_at: ...,
//       variant: ...,
//           } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------