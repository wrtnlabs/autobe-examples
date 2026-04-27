import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallProductCollector {
  export async function collect(props: {
    body: IECommerceMallProduct.ICreate;
    eCommerceMallSellers: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      visibility: "visible",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.eCommerceMallSellers.id } },
      category: props.body.category_id
        ? { connect: { id: props.body.category_id } }
        : undefined,
    } satisfies Prisma.e_commerce_mall_productsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallProductCollector {
//         export async function collect(props: {
//           body: IECommerceMallProduct.ICreate;
//           eCommerceMallSellers: IEntity; // from authorized actor
// eCommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       base_price: ...,
//       visibility: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       category: ...,
//       images: ...,
//       variants: ...,
//       productSnapshots: ...,
//       wishlistItems: ...,
//       reviews: ...,
//           } satisfies Prisma.e_commerce_mall_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------