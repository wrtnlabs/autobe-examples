import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformProductCollector {
  export async function collect(props: {
    body: IEcommercePlatformProduct.ICreate;
    ecommercePlatformSellerProfiles: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      sellerProfile: {
        connect: { id: props.ecommercePlatformSellerProfiles.id },
      },
      category: { connect: { id: props.body.category_id } },
    } satisfies Prisma.ecommerce_platform_productsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformProductCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformProduct.ICreate;
//           ecommercePlatformSellerProfiles: IEntity; // from authorized actor
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
//       sellerProfile: ...,
//       category: ...,
//       variants: ...,
//       wishlistItems: ...,
//       reviews: ...,
//       images: ...,
//       snapshotProducts: ...,
//           } satisfies Prisma.ecommerce_platform_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------