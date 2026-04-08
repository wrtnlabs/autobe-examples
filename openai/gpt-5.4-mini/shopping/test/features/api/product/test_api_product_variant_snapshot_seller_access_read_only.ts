import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_variant_snapshot_seller_access_read_only(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate seller access to product variant snapshots through the read-only historical inspection endpoint.
   *
   * This scenario verifies that an authenticated seller can use the seller-facing snapshot lookup path to inspect preserved variant history for a product. It covers the end-to-end flow of seller registration, product creation, and snapshot retrieval using an isolated seller connection so the base connection is never used directly.
   *
   * 1. Register and authenticate a seller using a dedicated seller connection.
   * 2. Create a product owned by that seller so the product scope exists for snapshot lookup.
   * 3. Request a variant snapshot through the seller snapshot endpoint with the product identifier and a UUID snapshot identifier.
   * 4. Validate the returned snapshot shape to ensure it exposes preserved historical product and variant references.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: 1000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshot =
    await api.functional.mallPlatform.seller.products.variantSnapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot product matches requested product",
    snapshot.product.id,
    product.id,
  );
  TestValidator.predicate(
    "snapshot preserves product reference for historical review",
    snapshot.product.name.length > 0 && snapshot.product.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves variant reference for historical reconstruction",
    snapshot.productVariant.skuCode.length > 0 &&
      snapshot.optionSummary.length > 0,
  );
}
