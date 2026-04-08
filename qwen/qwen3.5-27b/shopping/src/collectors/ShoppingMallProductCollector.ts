import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    shoppingMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.shoppingMallSellers.id } },
      category: props.body.category_id
        ? { connect: { id: props.body.category_id } }
        : undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallProductCollector {
//         export async function collect(props: {
//           body: IShoppingMallProduct.ICreate;
//           shoppingMallSellers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       base_price: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       category: ...,
//       wishlistEntries: ...,
//       images: ...,
//       variants: ...,
//       reviews: ...,
//       productSnapshots: ...,
//           } satisfies Prisma.shopping_mall_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------