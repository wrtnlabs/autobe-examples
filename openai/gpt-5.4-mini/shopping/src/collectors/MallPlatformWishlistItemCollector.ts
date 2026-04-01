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
    const now: Date = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      wishlist: {
        connect: {
          id: props.wishlist.id,
        },
      },
      product: {
        connect: {
          id: props.body.mallPlatformProductId,
        },
      },
    } satisfies Prisma.mall_platform_wishlist_itemsCreateInput;
  }
}
