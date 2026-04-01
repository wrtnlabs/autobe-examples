import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product } from "../prepare/prepare_random_mall_platform_product";

export async function generate_random_mall_platform_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProduct.ICreate> | undefined;
  },
): Promise<IMallPlatformProduct> {
  const prepared: IMallPlatformProduct.ICreate =
    prepare_random_mall_platform_product(props.body);
  return await api.functional.mallPlatform.seller.products.create(connection, {
    body: prepared,
  });
}
