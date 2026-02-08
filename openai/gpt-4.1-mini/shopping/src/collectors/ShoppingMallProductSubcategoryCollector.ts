import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductSubcategoryCollector {
  export async function collect(props: {
    body: IShoppingMallProductSubcategory.ICreate;
    shoppingMallProductCategories: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: "",
      description: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      category: { connect: { id: props.shoppingMallProductCategories.id } },
    } satisfies Prisma.shopping_mall_product_subcategoriesCreateInput;
  }
}
