import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import { prepare_random_shopping_mall_product_variant_attribute } from "../prepare/prepare_random_shopping_mall_product_variant_attribute";
export async function generate_random_shopping_mall_admin_product_variants_attributes_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallProductVariantAttribute.ICreate>
      | undefined;
  },
): Promise<IShoppingMallProductVariantAttribute> {
  const prepared: IShoppingMallProductVariantAttribute.ICreate =
    prepare_random_shopping_mall_product_variant_attribute(props.body);
  const result: IShoppingMallProductVariantAttribute =
    await api.functional.shoppingMall.admin.product_variants.attributes.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
