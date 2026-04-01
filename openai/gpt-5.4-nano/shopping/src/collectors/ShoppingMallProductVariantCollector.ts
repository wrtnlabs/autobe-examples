import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
  }) {
    return {
      id: v4(),
      code: props.body.code,
      title: props.body.title,
      option_value: props.body.option_value,
      price: props.body.price,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: {
          id: props.body.shopping_mall_product_id,
        },
      },
      snapshots: undefined,
      inventoryRecords: undefined,
      cartItems: undefined,
      orderItems: undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
