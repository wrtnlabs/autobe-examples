import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductImageCollector {
  export async function collect(props: {
    body: IMallPlatformProductImage.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      image_url: props.body.imageUrl,
      sort_order: props.body.sortOrder,
      is_main: props.body.isMain,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: {
        connect: {
          id: props.product.id,
        },
      },
    } satisfies Prisma.mall_platform_product_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformProductImageCollector {
//         export async function collect(props: {
//           body: IMallPlatformProductImage.ICreate;
//           mallPlatformProducts: IEntity; // from path parameter productId
//           
//           
//         }) {
//           return {
//       id: ...,
//       image_url: ...,
//       sort_order: ...,
//       is_main: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//           } satisfies Prisma.mall_platform_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------