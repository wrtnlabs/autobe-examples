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
    return {
      id,
      quantity_change: props.body.quantity_change,
      operation_type: props.body.operation_type,
      reference_id: props.body.reference_id ?? null,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
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
//       operation_type: ...,
//       reference_id: ...,
//       notes: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------