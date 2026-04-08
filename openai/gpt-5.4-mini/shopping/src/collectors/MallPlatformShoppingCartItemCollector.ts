import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformShoppingCartItemCollector {
  export async function collect(props: {
    body: IMallPlatformShoppingCartItem.ICreate;
    shoppingCart: IEntity;
    productVariant: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity: props.body.quantity,
      availability_state: "available",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shoppingCart: {
        connect: { id: props.shoppingCart.id },
      },
      productVariant: {
        connect: { id: props.body.productVariantId },
      },
    } satisfies Prisma.mall_platform_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformShoppingCartItemCollector {
//         export async function collect(props: {
//           body: IMallPlatformShoppingCartItem.ICreate;
//           mallPlatformShoppingCarts: IEntity; // from authorized actor
// mallPlatformShoppingCarts: IEntity; // from authorized session
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