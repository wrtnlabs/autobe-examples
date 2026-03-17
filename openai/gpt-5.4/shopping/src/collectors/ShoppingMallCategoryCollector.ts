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
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parent:
        props.body.parentId != null
          ? {
              connect: { id: props.body.parentId },
            }
          : undefined,
    } satisfies Prisma.shopping_mall_categoriesCreateInput;
  }
}
