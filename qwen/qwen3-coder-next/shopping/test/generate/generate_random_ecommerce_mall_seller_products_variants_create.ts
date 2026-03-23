import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant } from "../prepare/prepare_random_ecommerce_mall_product_variant";

export async function generate_random_ecommerce_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallProductVariant> {
  const prepared: IEcommerceMallProductVariant.ICreate =
    prepare_random_ecommerce_mall_product_variant(props.body);
  const result: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
