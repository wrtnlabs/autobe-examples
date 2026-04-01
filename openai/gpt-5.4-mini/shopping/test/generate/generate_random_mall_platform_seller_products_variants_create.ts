import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_variant } from "../prepare/prepare_random_mall_platform_product_variant";

export async function generate_random_mall_platform_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IMallPlatformProductVariant> {
  const prepared: IMallPlatformProductVariant.ICreate =
    prepare_random_mall_platform_product_variant(props.body);
  return await api.functional.mallPlatform.seller.products.variants.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
