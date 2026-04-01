import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductOptionValueCollector {
  export async function collect(props: {
    body: IShoppingMallProductOptionValue.ICreate;
    optionDefinition: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      optionDefinition: { connect: { id: props.optionDefinition.id } },
    } satisfies Prisma.shopping_mall_product_option_valuesCreateInput;
  }
}
