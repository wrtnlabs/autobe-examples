import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformOrderItemSnapshotVariantOptionCollector {
  export async function collect(props: {
    body: IMallPlatformOrderItemSnapshotVariantOption.ICreate;
    orderItemSnapshot: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      option_name: props.body.optionName,
      option_value: props.body.optionValue,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItemSnapshot: {
        connect: {
          id: props.orderItemSnapshot.id,
        },
      },
    } satisfies Prisma.mall_platform_order_item_snapshot_variant_optionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformOrderItemSnapshotVariantOptionCollector {
//         export async function collect(props: {
//           body: IMallPlatformOrderItemSnapshotVariantOption.ICreate;
//           mallPlatformOrderItemSnapshots: IEntity; // from path parameter orderItemSnapshotId
//           
//           
//         }) {
//           return {
//       id: ...,
//       option_name: ...,
//       option_value: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItemSnapshot: ...,
//           } satisfies Prisma.mall_platform_order_item_snapshot_variant_optionsCreateInput;
//         }
//       }
//--------------------------------------------------------------