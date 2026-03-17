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
    shoppingMallAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      parent: props.body.parent_category_id
        ? { connect: { id: props.body.parent_category_id } }
        : undefined,
      createdByAdmin: { connect: { id: props.shoppingMallAdmins.id } },
      // HasMany relations (not needed for create)
      // children, products, productSnapshots omitted
    } satisfies Prisma.shopping_mall_categoriesCreateInput;
  }
}
