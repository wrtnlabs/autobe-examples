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
    ecommerceMallSellers: IEntity;
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
      category: { connect: { id: props.body.category_id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      wishlistItems: undefined,
      customerReviews: undefined,
      images: undefined,
      variants: undefined,
      reviews: undefined,
      reviewSnapshots: undefined,
      reviewStat: undefined,
      snapshots: undefined,
      productSnapshots: undefined,
      variantSnapshots: undefined,
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
//       category: ...,
//       seller: ...,
//       wishlistItems: ...,
//       customerReviews: ...,
//       images: ...,
//       variants: ...,
//       reviews: ...,
//       reviewSnapshots: ...,
//       reviewStat: ...,
//       snapshots: ...,
//       productSnapshots: ...,
//       variantSnapshots: ...,
//           } satisfies Prisma.ecommerce_mall_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------