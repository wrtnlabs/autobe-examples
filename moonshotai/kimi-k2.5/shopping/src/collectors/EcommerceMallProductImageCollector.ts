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
  }) {
    // Calculate next display order for this product
    const lastImage =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: { product_id: props.ecommerceMallProducts.id },
        orderBy: { display_order: "desc" },
      });
    const displayOrder = lastImage ? lastImage.display_order + 1 : 0;
    return {
      id: v4(),
      image_url: props.body.imageUrl,
      display_order: displayOrder,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
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
//           
//           
//         }) {
//           return {
//       id: ...,
//       image_url: ...,
//       display_order: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//           } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------