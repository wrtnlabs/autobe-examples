import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductSnapshotVariantCollector {
  export async function collect(props: {
    body: IMallPlatformProductSnapshotVariant.ICreate;
    mallPlatformProductSnapshots: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.skuCode,
      option_values: props.body.optionValues,
      price_override: props.body.priceOverride ?? null,
      is_available: props.body.isAvailable,
      created_at: new Date(),
      productSnapshot: {
        connect: {
          id: props.mallPlatformProductSnapshots.id,
        },
      },
    } satisfies Prisma.mall_platform_product_snapshot_variantsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformProductSnapshotVariantCollector {
//         export async function collect(props: {
//           body: IMallPlatformProductSnapshotVariant.ICreate;
//           mallPlatformProductSnapshots: IEntity; // from path parameter {productSnapshotId}
//           
//           
//         }) {
//           return {
//       id: ...,
//       sku_code: ...,
//       option_values: ...,
//       price_override: ...,
//       is_available: ...,
//       created_at: ...,
//       productSnapshot: ...,
//       productVariantSnapshot: ...,
//           } satisfies Prisma.mall_platform_product_snapshot_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------