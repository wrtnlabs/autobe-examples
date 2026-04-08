import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductImageCollector {
  export async function collect(props: {
    body: IEcommerceMallProductImage.ICreate;
    ecommerceMallProducts: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      image_url: props.body.imageUrl,
      display_order: props.body.displayOrder ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.ecommerceMallProducts.id } },
    } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallProductImageCollector {
//         export async function collect(props: {
//           body: IEcommerceMallProductImage.ICreate;
//           ecommerceMallProducts: IEntity; // from path parameter productId
// ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       image_url: ...,
//       display_order: ...,
//       created_at: ...,
//       updated_at: ...,
//       product: ...,
//           } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------