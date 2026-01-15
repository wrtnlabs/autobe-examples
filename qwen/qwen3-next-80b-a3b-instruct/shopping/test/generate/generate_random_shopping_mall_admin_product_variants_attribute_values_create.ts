import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
import { prepare_random_shopping_mall_variant_attribute_value } from "../prepare/prepare_random_shopping_mall_variant_attribute_value";
export async function generate_random_shopping_mall_admin_product_variants_attribute_values_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallVariantAttributeValue.ICreate> | undefined;
  },
): Promise<IShoppingMallVariantAttributeValue> {
  const prepared: IShoppingMallVariantAttributeValue.ICreate =
    prepare_random_shopping_mall_variant_attribute_value(props.body);
  return await api.functional.shoppingMall.admin.product_variants.attribute_values.create(
    connection,
    {
      body: prepared,
    },
  );
}
