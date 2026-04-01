import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCartItemCollector {
  export async function collect(props: {
    body: IMallPlatformCartItem.ICreate;
    shoppingCart: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      quantity: props.body.quantity,
      availability_state: "available",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shoppingCart: {
        connect: {
          id: props.shoppingCart.id,
        },
      },
      productVariant: {
        connect: {
          id: props.body.mall_platform_product_variant_id,
        },
      },
    } satisfies Prisma.mall_platform_cart_itemsCreateInput;
  }
}
