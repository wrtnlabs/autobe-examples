import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallVariantAttributeCollector {
  export async function collect(props: {
    body: IShoppingMallVariantAttribute.ICreate;
  }) {
    // Generate server-side sequential order_number based on current count (AutoBE pattern for system-generated fields)
    const orderNumber =
      (await MyGlobal.prisma.shopping_mall_variant_attributes.count()) + 1;
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      type: props.body.type,
      validator: props.body.validation
        ? JSON.stringify(props.body.validation)
        : null,
      order_number: orderNumber, // Correctly generated server-side
      created_at: new Date(),
      updated_at: new Date(),
      shopping_mall_variant_attribute_values: undefined,
    } satisfies Prisma.shopping_mall_variant_attributesCreateInput;
  }
}
