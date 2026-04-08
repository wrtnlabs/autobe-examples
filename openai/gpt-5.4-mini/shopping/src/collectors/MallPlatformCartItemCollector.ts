import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCartItemCollector {
  export async function collect(props: {
    body: IMallPlatformCartItem.ICreate;
    shoppingCart: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      quantity: props.body.quantity,
      availability_state: "available",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shoppingCart: {
        connect: {
          id: props.shoppingCart.id,
        },
      },
      productVariant: {
        connect: {
          id: props.body.productVariantId,
        },
      },
    } satisfies Prisma.mall_platform_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformCartItemCollector {
//         export async function collect(props: {
//           body: IMallPlatformCartItem.ICreate;
//           mallPlatformShoppingCarts: IEntity; // from path parameter {cartId}
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       availability_state: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       shoppingCart: ...,
//       productVariant: ...,
//           } satisfies Prisma.mall_platform_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------