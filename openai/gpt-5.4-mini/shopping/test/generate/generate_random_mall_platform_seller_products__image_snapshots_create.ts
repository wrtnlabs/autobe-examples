import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_image_snapshot } from "../prepare/prepare_random_mall_platform_product_image_snapshot";

export async function generate_random_mall_platform_seller_products__image_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductImageSnapshot.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IMallPlatformProductImageSnapshot> {
  const prepared: IMallPlatformProductImageSnapshot.ICreate =
    prepare_random_mall_platform_product_image_snapshot(props.body);
  const result: IMallPlatformProductImageSnapshot =
    await api.functional.mallPlatform.seller.products._imageSnapshots.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
      },
    );
  return result;
}
