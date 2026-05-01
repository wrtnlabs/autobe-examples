import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductImageCollector {
  export async function collect(props: {
    body: IShoppingMallProductImage.ICreate;
    product: IEntity;
    displayOrder: number;
  }) {
    return {
      id: v4(),
      image_url: props.body.image_url,
      display_order: props.displayOrder,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.product.id } },
      snapshotImages: undefined,
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallProductImageCollector {
//         export async function collect(props: {
//           body: IShoppingMallProductImage.ICreate;
//           shoppingMallProducts: IEntity; // from path parameter productId
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
//       snapshotImages: ...,
//           } satisfies Prisma.shopping_mall_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------