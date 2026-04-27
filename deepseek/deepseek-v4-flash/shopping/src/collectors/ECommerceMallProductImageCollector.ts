import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallProductImageCollector {
  export async function collect(props: {
    body: IECommerceMallProductImage.ICreate;
    eCommerceMallProducts: IEntity;
    eCommerceMallSellers: IEntity;
    eCommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    // Determine sort position: 0 for first image, max+1 for subsequent
    const maxSortOrder =
      await MyGlobal.prisma.e_commerce_mall_product_images.aggregate({
        where: { e_commerce_mall_product_id: props.eCommerceMallProducts.id },
        _max: { sort_order: true },
      });
    const sortOrder: number =
      maxSortOrder._max.sort_order !== null
        ? maxSortOrder._max.sort_order + 1
        : 0;
    return {
      id,
      url: props.body.url,
      sort_order: sortOrder,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.eCommerceMallProducts.id } },
    } satisfies Prisma.e_commerce_mall_product_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallProductImageCollector {
//         export async function collect(props: {
//           body: IECommerceMallProductImage.ICreate;
//           eCommerceMallProducts: IEntity; // from path parameter productId
// eCommerceMallSellers: IEntity; // from authorized actor
// eCommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       url: ...,
//       sort_order: ...,
//       created_at: ...,
//       updated_at: ...,
//       product: ...,
//           } satisfies Prisma.e_commerce_mall_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------