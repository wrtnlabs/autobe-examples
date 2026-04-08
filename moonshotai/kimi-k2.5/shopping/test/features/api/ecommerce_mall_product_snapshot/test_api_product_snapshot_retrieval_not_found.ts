import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test error handling for non-existent product snapshot retrieval.
 *
 * This E2E test verifies that when a seller attempts to retrieve a snapshot
 * that does not exist using a valid product ID but invalid snapshot ID,
 * the API correctly returns a 404 Not Found error.
 */
export async function test_api_product_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: "https://test.ecommerce.com/seller/join",
      referrer: "https://test.ecommerce.com",
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<20> & tags.MaxLength<255>>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create a product to obtain a valid productId
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Generate a non-existent snapshot ID
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent snapshot and verify 404
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.products.snapshots.at(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
