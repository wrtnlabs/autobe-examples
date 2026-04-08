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
    shoppingMallProducts: IEntity;
  }) {
    const id: string = v4();
    // Query existing images for this product to determine next display_order
    const existingImages =
      await MyGlobal.prisma.shopping_mall_product_images.findMany({
        where: {
          shopping_mall_product_id: props.shoppingMallProducts.id,
          deleted_at: null,
        },
        orderBy: {
          display_order: "desc",
        },
        take: 1,
      });
    const displayOrder =
      existingImages.length > 0 ? existingImages[0].display_order + 1 : 0;
    return {
      id,
      display_order: displayOrder,
      image_uri: props.body.image_uri,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.shoppingMallProducts.id } },
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
//       display_order: ...,
//       image_uri: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//           } satisfies Prisma.shopping_mall_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------