import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerCartItemCollector {
  export async function collect(props: {
    body: IShoppingMallCustomerCartItem.ICreate;
    shoppingMallCustomerCarts: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: { connect: { id: props.shoppingMallCustomerCarts.id } },
      productVariant: { connect: { id: props.body.productVariantId } },
    } satisfies Prisma.shopping_mall_customer_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallCustomerCartItemCollector {
//         export async function collect(props: {
//           body: IShoppingMallCustomerCartItem.ICreate;
//           shoppingMallCustomerCarts: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       cart: ...,
//       productVariant: ...,
//           } satisfies Prisma.shopping_mall_customer_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------