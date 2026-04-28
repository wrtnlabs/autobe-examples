import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformInventoryRecordCollector {
  export async function collect(props: {
    body: IEcommercePlatformInventoryRecord.ICreate;
    ecommercePlatformProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      quantity_delta: props.body.quantity_delta,
      reason: props.body.reason,
      created_at: new Date(),
      productVariant: {
        connect: { id: props.ecommercePlatformProductVariants.id },
      },
    } satisfies Prisma.ecommerce_platform_inventory_recordsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformInventoryRecordCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformInventoryRecord.ICreate;
//           ecommercePlatformProductVariants: IEntity; // from path parameter variantId
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity_delta: ...,
//       reason: ...,
//       created_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_platform_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------