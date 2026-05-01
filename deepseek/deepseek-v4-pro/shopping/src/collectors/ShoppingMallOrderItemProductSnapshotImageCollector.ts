import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemProductSnapshotImageCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItemProductSnapshotImage.ICreate;
    shoppingMallOrderItemProductSnapshots: IEntity;
  }) {
    return {
      id: v4(),
      image_url: props.body.image_url,
      display_order: props.body.display_order,
      created_at: new Date(),
      productSnapshot: {
        connect: { id: props.shoppingMallOrderItemProductSnapshots.id },
      },
    } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallOrderItemProductSnapshotImageCollector {
//         export async function collect(props: {
//           body: IShoppingMallOrderItemProductSnapshotImage.ICreate;
//           shoppingMallOrderItemProductSnapshots: IEntity; // from path parameter itemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       image_url: ...,
//       display_order: ...,
//       created_at: ...,
//       productSnapshot: ...,
//           } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------