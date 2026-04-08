import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallWishlistItemCollector {
  export async function collect(props: {
    body: IEcommerceMallWishlistItem.ICreate;
    wishlist: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      wishlist: { connect: { id: props.wishlist.id } },
      product: { connect: { id: props.body.productId } },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallWishlistItemCollector {
//         export async function collect(props: {
//           body: IEcommerceMallWishlistItem.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       wishlist: ...,
//       product: ...,
//           } satisfies Prisma.ecommerce_mall_wishlist_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------