import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductCollector {
  export async function collect(props: {
    body: IMallPlatformProduct.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.basePrice,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sellerAccount: {
        connect: {
          id: props.seller.id,
        },
      },
      category: props.body.categoryId
        ? {
            connect: {
              id: props.body.categoryId,
            },
          }
        : undefined,
    } satisfies Prisma.mall_platform_productsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformProductCollector {
//         export async function collect(props: {
//           body: IMallPlatformProduct.ICreate;
//           mallPlatformSellerAccounts: IEntity; // from authorized actor
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
//       sellerAccount: ...,
//       category: ...,
//       images: ...,
//       variants: ...,
//       productImageSnapshots: ...,
//       variantSnapshots: ...,
//       wishlistItems: ...,
//       reviews: ...,
//       snapshots: ...,
//           } satisfies Prisma.mall_platform_productsCreateInput;
//         }
//       }
//--------------------------------------------------------------