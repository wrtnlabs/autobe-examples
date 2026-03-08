import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test product variant snapshot retrieval for deleted/non-existent products.
 * Validates that snapshots remain accessible and return proper pagination metadata
 * even when the product doesn't exist or has no snapshots (for dispute resolution).
 */
export async function test_api_product_variant_snapshot_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Test snapshots for product with no snapshots (empty scenario)
  const emptyProductId = typia.random<string & tags.Format<"uuid">>();
  const emptySnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: emptyProductId,
        body: {
          page: 1,
          limit: 10,
          sortDirection: "desc",
        },
      },
    );
  typia.assert(emptySnapshots);
  // Verify empty response has correct pagination
  TestValidator.equals("empty data array", emptySnapshots.data.length, 0);
  TestValidator.equals(
    "pagination records zero",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero",
    emptySnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current one",
    emptySnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    emptySnapshots.pagination.limit,
    10,
  );
  // 3. Test snapshots for non-existent product (simulating deleted product scenario)
  const deletedProductId = typia.random<string & tags.Format<"uuid">>();
  const deletedSnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: deletedProductId,
        body: {
          page: 1,
          limit: 10,
          sortDirection: "desc",
        },
      },
    );
  typia.assert(deletedSnapshots);
  // Verify empty response for deleted product (business rule: snapshots preserved)
  TestValidator.equals(
    "deleted product snapshots empty",
    deletedSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "deleted product pagination records zero",
    deletedSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "deleted product pagination pages zero",
    deletedSnapshots.pagination.pages,
    0,
  );
  // 4. Test with filter parameters on empty result
  const filteredSnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: deletedProductId,
        body: {
          page: 1,
          limit: 20,
          sortDirection: "asc",
          created_atGte: new Date().toISOString(),
          created_atLte: new Date().toISOString(),
          is_active: true,
          stockQuantityGte: 0,
        },
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.equals("filtered empty data", filteredSnapshots.data.length, 0);
  TestValidator.equals(
    "filtered pagination limit",
    filteredSnapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "filtered pagination pages",
    filteredSnapshots.pagination.pages,
    0,
  );
  // 5. Test pagination edge cases
  const page2Snapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: deletedProductId,
        body: {
          page: 999,
          limit: 100,
          sortDirection: "desc",
        },
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.equals("page 2 data empty", page2Snapshots.data.length, 0);
  TestValidator.equals(
    "page 2 pagination current",
    page2Snapshots.pagination.current,
    999,
  );
  TestValidator.equals(
    "page 2 pagination records",
    page2Snapshots.pagination.records,
    0,
  );
  // 7. Test limit boundary (1-100)
  const maxLimitSnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: deletedProductId,
        body: {
          page: 1,
          limit: 100,
          sortDirection: "desc",
        },
      },
    );
  typia.assert(maxLimitSnapshots);
  TestValidator.equals(
    "max limit data empty",
    maxLimitSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitSnapshots.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit pagination pages",
    maxLimitSnapshots.pagination.pages,
    0,
  );
  // 8. Test with minimal parameters
  const minimalSnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: deletedProductId,
        body: {},
      },
    );
  typia.assert(minimalSnapshots);
  TestValidator.equals("minimal data empty", minimalSnapshots.data.length, 0);
  TestValidator.equals(
    "minimal pagination records",
    minimalSnapshots.pagination.records,
    0,
  );
}
