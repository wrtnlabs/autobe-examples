import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformWishlistItemCollector {
  export async function collect(props: {
    body: IEcommercePlatformWishlistItem.ICreate;
    ecommercePlatformCustomers: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommercePlatformCustomers.id } },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.ecommerce_platform_wishlist_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformWishlistItemCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformWishlistItem.ICreate;
//           ecommercePlatformCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       product: ...,
//           } satisfies Prisma.ecommerce_platform_wishlist_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------