import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductAttributeValueCollector {
  export async function collect(props: {
    body: IShoppingMallProductAttributeValue.ICreate;
    attribute: IEntity;
  }) {
    return {
      id: v4(),
      value: props.body.value,
      description: null,
      created_at: new Date(),
      updated_at: new Date(),
      attribute: {
        connect: { id: props.attribute.id },
      },
      shopping_mall_product_variant_attributes: undefined,
    } satisfies Prisma.shopping_mall_product_attribute_valuesCreateInput;
  }
}
