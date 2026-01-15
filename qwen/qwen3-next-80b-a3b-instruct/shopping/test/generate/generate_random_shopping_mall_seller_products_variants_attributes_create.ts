import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import type { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
import { prepare_random_shopping_mall_variant_attribute } from "../prepare/prepare_random_shopping_mall_variant_attribute";
export async function generate_random_shopping_mall_seller_products_variants_attributes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallVariantAttribute.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallVariantAttribute> {
  const prepared: IShoppingMallVariantAttribute.ICreate =
    prepare_random_shopping_mall_variant_attribute(props.body);
  return await api.functional.shoppingMall.seller.products.variants.attributes.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
