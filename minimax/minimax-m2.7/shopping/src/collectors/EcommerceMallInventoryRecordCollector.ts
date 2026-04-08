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
    return {
      id: v4(),
      quantity_change: props.body.quantityChange,
      reason: props.body.reason,
      created_at: new Date(),
      productVariant: {
        connect: { id: props.ecommerceMallProductVariants.id },
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallInventoryRecordCollector {
//         export async function collect(props: {
//           body: IEcommerceMallInventoryRecord.ICreate;
//           ecommerceMallProductVariants: IEntity; // from path parameter variantId
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity_change: ...,
//       reason: ...,
//       created_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------