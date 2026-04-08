import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerWishlistCollector {
  export async function collect(props: {
    body: IShoppingMallCustomerWishlist.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: props.body.productId } },
    } satisfies Prisma.shopping_mall_customer_wishlistsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallCustomerWishlistCollector {
//         export async function collect(props: {
//           body: IShoppingMallCustomerWishlist.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       product: ...,
//           } satisfies Prisma.shopping_mall_customer_wishlistsCreateInput;
//         }
//       }
//--------------------------------------------------------------