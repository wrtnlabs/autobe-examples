import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductAttributeCollector {
  export async function collect(props: {
    body: IShoppingMallProductAttribute.ICreate;
    shoppingMallProducts: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: "",
      sort_order: 0,
      shopping_mall_product_attribute_values: undefined,
    } satisfies Prisma.shopping_mall_product_attributesCreateInput;
  }
}
