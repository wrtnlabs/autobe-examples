import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformInventoryRecordCollector {
  export async function collect(props: {
    body: IMallPlatformInventoryRecord.ICreate;
    mallPlatformProductVariants: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      quantity_change: props.body.quantityChange,
      reason: props.body.reason,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      productVariant: {
        connect: {
          id: props.mallPlatformProductVariants.id,
        },
      },
    } satisfies Prisma.mall_platform_inventory_recordsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformInventoryRecordCollector {
//         export async function collect(props: {
//           body: IMallPlatformInventoryRecord.ICreate;
//           mallPlatformProductVariants: IEntity; // from path parameter {variantId}
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity_change: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.mall_platform_inventory_recordsCreateInput;
//         }
//       }
//--------------------------------------------------------------