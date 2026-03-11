import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
    body?: DeepPartial<IEcommerceMallProductVariant.ICreate>;
    params?: {
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
        productId: props.params?.productId ?? ("00000000-0000-0000-0000-000000000000" satisfies string as string & tags.Format<"uuid">),
        body: prepared,
      },
    );
  return result;
}