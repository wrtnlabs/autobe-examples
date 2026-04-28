import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformShoppingCartItemCollector {
  export async function collect(props: {
    body: IEcommercePlatformShoppingCartItem.ICreate;
    ecommercePlatformCustomers: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ecommercePlatformCustomer: {
        connect: { id: props.ecommercePlatformCustomers.id },
      },
      ecommercePlatformProductVariant: {
        connect: { id: props.body.product_variant_id },
      },
    } satisfies Prisma.ecommerce_platform_shopping_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformShoppingCartItemCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformShoppingCartItem.ICreate;
//           ecommercePlatformCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       ecommercePlatformCustomer: ...,
//       ecommercePlatformProductVariant: ...,
//           } satisfies Prisma.ecommerce_platform_shopping_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------