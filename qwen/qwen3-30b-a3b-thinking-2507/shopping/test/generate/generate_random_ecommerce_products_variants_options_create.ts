import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product_variant_option } from "../prepare/prepare_random_ecommerce_product_variant_option";

export async function generate_random_ecommerce_products_variants_options_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProductVariantOption.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommerceProductVariantOption> {
  const prepared: IEcommerceProductVariantOption.ICreate =
    prepare_random_ecommerce_product_variant_option(props.body);
  return await api.functional.ecommerce.products.variants.options.create(
    connection,
    {
      productId: props.params.productId,
      variantId: props.params.variantId,
      body: prepared,
    },
  );
}
