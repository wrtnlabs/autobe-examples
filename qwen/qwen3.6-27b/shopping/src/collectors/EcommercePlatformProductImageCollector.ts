import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformProductImageCollector {
  export function collect(props: {
    body: IEcommercePlatformProductImage.ICreate;
    ecommercePlatformProducts: IEntity;
  }) {
    const now = new Date();
    return {
      id: v4(),
      uri: props.body.uri,
      order_index: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: { connect: { id: props.ecommercePlatformProducts.id } },
    } satisfies Prisma.ecommerce_platform_product_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformProductImageCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformProductImage.ICreate;
//           ecommercePlatformProducts: IEntity; // from path parameter {productId}
//           
//           
//         }) {
//           return {
//       id: ...,
//       uri: ...,
//       order_index: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//           } satisfies Prisma.ecommerce_platform_product_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------