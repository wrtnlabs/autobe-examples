import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantOptionValueCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantOptionValue.ICreate;
    variant: IEntity;
  }) {
    return {
      id: v4(),
      option_name: props.body.option_name,
      option_value: props.body.option_value,
      variant: { connect: { id: props.variant.id } },
    } satisfies Prisma.shopping_mall_product_variant_option_valuesCreateInput;
  }
}
