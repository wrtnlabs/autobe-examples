import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformWishlistItemCollector {
  export async function collect(props: {
    body: IMallPlatformWishlistItem.ICreate;
    wishlist: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      wishlist: {
        connect: {
          id: props.wishlist.id,
        },
      },
      product: {
        connect: {
          id: props.body.product_id,
        },
      },
    } satisfies Prisma.mall_platform_wishlist_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformWishlistItemCollector {
//         export async function collect(props: {
//           body: IMallPlatformWishlistItem.ICreate;
//           mallPlatformCustomers: IEntity; // from authorized actor
// mallPlatformWishlists: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       wishlist: ...,
//       product: ...,
//           } satisfies Prisma.mall_platform_wishlist_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------