import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallWishlistItemCollector {
  export async function collect(props: {
    body: IShoppingMallWishlistItem.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.shopping_mall_wishlist_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallWishlistItemCollector {
//         export async function collect(props: {
//           body: IShoppingMallWishlistItem.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       customer: ...,
//       product: ...,
//           } satisfies Prisma.shopping_mall_wishlist_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------