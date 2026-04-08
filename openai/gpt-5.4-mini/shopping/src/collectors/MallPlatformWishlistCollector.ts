import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformWishlistCollector {
  export async function collect(props: {
    body: IMallPlatformWishlist.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
    } satisfies Prisma.mall_platform_wishlistsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformWishlistCollector {
//         export async function collect(props: {
//           body: IMallPlatformWishlist.ICreate;
//           mallPlatformCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       wishlistItems: ...,
//           } satisfies Prisma.mall_platform_wishlistsCreateInput;
//         }
//       }
//--------------------------------------------------------------