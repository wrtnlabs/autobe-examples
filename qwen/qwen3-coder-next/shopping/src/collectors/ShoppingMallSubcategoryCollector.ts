import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSubcategoryCollector {
  export async function collect(props: {
    body: IShoppingMallSubcategory.ICreate;
    shoppingMallCategories: IEntity;
  }) {
    return {
      id: v4(),
      name: "",
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      category: { connect: { id: props.shoppingMallCategories.id } },
    } satisfies Prisma.shopping_mall_subcategoriesCreateInput;
  }
}
