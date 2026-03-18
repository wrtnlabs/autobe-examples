import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantOptionCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantOption.ICreate;
    productVariant: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      option_name: props.body.option_name,
      option_value: props.body.option_value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      productVariant: {
        connect: {
          id: props.productVariant.id,
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_optionsCreateInput;
  }
}
