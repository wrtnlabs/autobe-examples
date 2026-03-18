import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCategoryCollector {
  export async function collect(props: {
    body: IShoppingMallCategory.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      slug: props.body.slug,
      visibility: props.body.visibility,
      display_order: props.body.display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parentCategory:
        props.body.parent_category_id != null
          ? { connect: { id: props.body.parent_category_id } }
          : undefined,
      // Reverse relations are intentionally omitted on create:
      // childCategories, products
    } satisfies Prisma.shopping_mall_categoriesCreateInput;
  }
}
