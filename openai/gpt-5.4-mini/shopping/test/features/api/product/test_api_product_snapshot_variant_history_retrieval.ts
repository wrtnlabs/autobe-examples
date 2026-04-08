import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
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

/**
 * Test seller-access variant snapshot history retrieval for a product snapshot endpoint.
 *
 * Validates that an authenticated seller can call the snapshot variant history endpoint for one of their own products and receive a well-formed paginated response. Because the available API surface in this test context does not expose snapshot creation or product editing endpoints, the test focuses on the read contract, pagination metadata, and immutable row shape when history rows are returned.
 *
 * The test also ensures the request is executed with an actor-specific seller connection, not the base connection, and that the returned payload can be safely validated as a paginated snapshot-variant list.
 *
 * 1. Create an authenticated seller session.
 * 2. Create a product owned by that seller.
 * 3. Call the snapshot variant history endpoint with the product id and a UUID snapshot id.
 * 4. Validate pagination metadata and historical row ordering/shape when rows are present.
 */
export async function test_api_product_snapshot_variant_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
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
        basePrice: typia.random<number>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshotVariants =
    await api.functional.mallPlatform.seller.products.snapshots.variants.getByProductidAndSnapshotid(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshotVariants);
  TestValidator.predicate(
    "pagination records and data length are consistent",
    snapshotVariants.pagination.records >= snapshotVariants.data.length,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    snapshotVariants.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    snapshotVariants.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    snapshotVariants.pagination.limit >= 0,
  );
  for (let i = 1; i < snapshotVariants.data.length; i += 1) {
    TestValidator.predicate(
      "variant snapshot rows are sorted by createdAt ascending",
      snapshotVariants.data[i - 1]!.createdAt <=
        snapshotVariants.data[i]!.createdAt,
    );
  }
  for (const row of snapshotVariants.data) {
    TestValidator.equals(
      "row product snapshot matches requested product",
      row.productSnapshot.product.id,
      product.id,
    );
    TestValidator.predicate("row skuCode is not empty", row.skuCode.length > 0);
    TestValidator.predicate(
      "row optionValues is not empty",
      row.optionValues.length > 0,
    );
    TestValidator.predicate(
      "row createdAt is present",
      row.createdAt.length > 0,
    );
    TestValidator.predicate(
      "row isAvailable is a boolean value",
      typeof row.isAvailable === "boolean",
    );
  }
}
