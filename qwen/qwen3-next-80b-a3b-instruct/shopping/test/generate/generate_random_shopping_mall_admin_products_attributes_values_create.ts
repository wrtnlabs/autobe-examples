import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { prepare_random_shopping_mall_product_attribute_value } from "../prepare/prepare_random_shopping_mall_product_attribute_value";
export async function generate_random_shopping_mall_admin_products_attributes_values_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductAttributeValue.ICreate> | undefined;
    params: {
      productId: string;
      attributeId: string;
    };
  },
): Promise<IShoppingMallProductAttributeValue> {
  const prepared: IShoppingMallProductAttributeValue.ICreate =
    prepare_random_shopping_mall_product_attribute_value(props.body);
  return await api.functional.shoppingMall.admin.products.attributes.values.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      attributeId: props.params.attributeId,
    },
  );
}
