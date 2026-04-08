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
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
  }) {
    // Query the customer's wishlist to get the wishlist ID
    const wishlist =
      await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
        where: {
          customer: { id: props.ecommerceMallCustomers.id },
        },
      });
    return {
      id: v4(),
      created_at: new Date(),
      wishlist: { connect: { id: wishlist.id } },
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
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallCustomerSessions: IEntity; // from authorized session
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