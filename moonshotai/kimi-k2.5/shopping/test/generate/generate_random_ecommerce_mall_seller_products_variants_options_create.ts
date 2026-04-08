import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant_option } from "../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function generate_random_ecommerce_mall_seller_products_variants_options_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductVariantOption.ICreate>;
    params: {
      productId: string;
      productVariantId: string;
    };
  },
): Promise<IEcommerceMallProductVariantOption> {
  const prepared: IEcommerceMallProductVariantOption.ICreate =
    prepare_random_ecommerce_mall_product_variant_option(props.body);
  const result: IEcommerceMallProductVariantOption =
    await api.functional.ecommerceMall.seller.products.variants.options.create(
      connection,
      {
        productId: props.params.productId,
        productVariantId: props.params.productVariantId,
        body: prepared,
      },
    );
  return result;
}
