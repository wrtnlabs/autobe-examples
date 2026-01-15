import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantAttributeCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantAttribute.ICreate;
  }) {
    return {
      id: v4(),
    } satisfies Prisma.shopping_mall_product_variant_attributesCreateInput;
  }
}
