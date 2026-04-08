import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallWishlistCollector {
  export async function collect(props: {
    body: IEcommerceMallWishlist.ICreate;
    ecommerceMallMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      customer: {
        connect: { id: props.ecommerceMallMembers.id },
      },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_wishlistsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallWishlistCollector {
//         export async function collect(props: {
//           body: IEcommerceMallWishlist.ICreate;
//           ecommerceMallMembers: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//           } satisfies Prisma.ecommerce_mall_wishlistsCreateInput;
//         }
//       }
//--------------------------------------------------------------