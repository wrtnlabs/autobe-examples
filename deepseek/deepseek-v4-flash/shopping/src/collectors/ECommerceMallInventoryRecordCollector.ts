import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallInventoryRecordCollector {
  export async function collect(props: {
    body: IECommerceMallInventoryRecord.ICreate;
    eCommerceMallProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      productVariant: {
        connect: { id: props.eCommerceMallProductVariants.id },
      },
    } satisfies Prisma.e_commerce_mall_inventory_recordsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallInventoryRecordCollector {
//         export async function collect(props: {
//           body: IECommerceMallInventoryRecord.ICreate;
//           eCommerceMallProductVariants: IEntity; // from path parameter variantId
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity_change: ...,
//       reason: ...,
//       created_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.e_commerce_mall_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------