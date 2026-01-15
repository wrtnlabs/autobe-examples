import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import { prepare_random_shopping_mall_product_variant_attribute } from "../prepare/prepare_random_shopping_mall_product_variant_attribute";
export async function generate_random_shopping_mall_admin_products_variants_attributes_update(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallProductVariantAttribute.ICreate>
      | undefined;
    params: {
      productId: string;
      attributeId: string;
    };
  },
): Promise<IShoppingMallProductVariantAttribute> {
  const prepared: IShoppingMallProductVariantAttribute.ICreate =
    prepare_random_shopping_mall_product_variant_attribute(props.body);
  return await api.functional.shoppingMall.admin.products.variants.attributes.update(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      attributeId: props.params.attributeId,
    },
  );
}
