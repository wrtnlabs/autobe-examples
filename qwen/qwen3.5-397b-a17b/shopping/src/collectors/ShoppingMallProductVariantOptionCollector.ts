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
    shoppingMallProductVariants: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      variant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_product_variant_optionsCreateInput;
  }
}
