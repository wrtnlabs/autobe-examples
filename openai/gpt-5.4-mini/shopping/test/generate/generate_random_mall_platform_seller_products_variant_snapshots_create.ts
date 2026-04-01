import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_variant_snapshot } from "../prepare/prepare_random_mall_platform_product_variant_snapshot";

export async function generate_random_mall_platform_seller_products_variant_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductVariantSnapshot.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IMallPlatformProductVariantSnapshot> {
  const prepared: IMallPlatformProductVariantSnapshot.ICreate =
    prepare_random_mall_platform_product_variant_snapshot(props.body);
  return await api.functional.mallPlatform.seller.products.variantSnapshots.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
