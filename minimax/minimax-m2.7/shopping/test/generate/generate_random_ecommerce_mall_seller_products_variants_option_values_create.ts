import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant_option_value } from "../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function generate_random_ecommerce_mall_seller_products_variants_option_values_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductVariantOptionValue.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommerceMallProductVariantOptionValue> {
  const prepared: IEcommerceMallProductVariantOptionValue.ICreate =
    prepare_random_ecommerce_mall_product_variant_option_value(props.body);
  const result: IEcommerceMallProductVariantOptionValue =
    await api.functional.ecommerceMall.seller.products.variants.option_values.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
        variantId: props.params.variantId,
      },
    );
  return result;
}