import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductCollector {
  export async function collect(props: {
    body: IEcommerceMallProduct.ICreate;
    seller: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.basePrice,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.categoryId } },
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallProductCollector {
//         export async function collect(props: {
//           body: IEcommerceMallProduct.ICreate;
//           ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallSellerSessions: IEntity; // from authorized session
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
//       productImages: ...,
//       variants: ...,
//       productSnapshots: ...,
//       wishlistItems: ...,
//       orderItems: ...,
//       reviews: ...,
//           } satisfies Prisma.ecommerce_mall_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------