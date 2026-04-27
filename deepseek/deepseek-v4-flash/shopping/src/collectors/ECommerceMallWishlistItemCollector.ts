import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallWishlistItemCollector {
  export async function collect(props: {
    body: IECommerceMallWishlistItem.ICreate;
    customer: IEntity;
    session: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.e_commerce_mall_wishlist_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallWishlistItemCollector {
//         export async function collect(props: {
//           body: IECommerceMallWishlistItem.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
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
//           } satisfies Prisma.e_commerce_mall_wishlist_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------