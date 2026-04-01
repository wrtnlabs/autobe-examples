import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductOptionDefinitionCollector {
  export async function collect(props: {
    body: IShoppingMallProductOptionDefinition.ICreate;
    product: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.shopping_mall_product_option_definitionsCreateInput;
  }
}
