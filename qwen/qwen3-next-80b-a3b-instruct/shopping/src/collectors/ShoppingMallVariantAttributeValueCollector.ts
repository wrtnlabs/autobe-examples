import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallVariantAttributeValueCollector {
  export async function collect(props: {
    body: IShoppingMallVariantAttributeValue.ICreate;
  }) {
    return {
      id: v4(),
      value: props.body.name,
      display_order: props.body.display_order ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      variantAttribute: {
        connect: { id: props.body.attribute_type_id },
      },
      shopping_mall_variant_compatibility_of_subject_attribu_ef397b36:
        undefined,
      shopping_mall_variant_compatibility_of_object_attribut_664f8f74:
        undefined,
    } satisfies Prisma.shopping_mall_variant_attribute_valuesCreateInput;
  }
}
