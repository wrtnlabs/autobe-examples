import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product_variant } from "../prepare/prepare_random_ecommerce_product_variant";

export async function generate_random_ecommerce_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProductVariant.ICreate> | undefined;
    params?: {
      productId: string;
    };
  },
): Promise<IEcommerceProductVariant> {
  const prepared: IEcommerceProductVariant.ICreate =
    prepare_random_ecommerce_product_variant(props.body);
  const result: IEcommerceProductVariant =
    await api.functional.ecommerce.products.variants.create(connection, {
      productId: props.params?.productId ?? "00000000-0000-0000-0000-000000000000",
      body: prepared,
    });
  return result;
}