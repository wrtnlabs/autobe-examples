import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test that a seller can successfully view the snapshot history of their own product.
 *
 * Validates the product snapshot viewing workflow for sellers, including product creation and snapshot retrieval with pagination and date filtering. Tests the snapshot listing endpoint's response structure, ordering, and filtering capabilities.
 *
 * This test ensures that sellers can access product modification history for compliance and dispute resolution purposes. The snapshot endpoint returns historical product states created by previous edits.
 *
 * 1. Seller authenticates via join operation with randomized credentials
 * 2. Seller creates a new product with initial name, description, category, and base price
 * 3. Snapshot listing endpoint is called with product ID
 * 4. Response is validated:
 *    - Snapshots contain id, name, category_id, base_price, created_at
 *    - Snapshots ordered by created_at descending (newest first)
 *    - Pagination metadata is correct
 * 5. Pagination is tested with limit parameter and metadata verification
 * 6. Date range filtering is tested with 'from' and 'to' parameters
 */
export async function test_api_product_snapshot_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create initial product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Retrieve all snapshots
  const allSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // 4. Validate snapshot structure
  for (const snapshot of allSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has valid id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has valid name",
      snapshot.name !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid category_id",
      snapshot.category_id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid base_price",
      snapshot.base_price !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      snapshot.created_at !== undefined,
    );
  }
  // 5. Verify snapshots are ordered by created_at descending
  for (let i = 0; i < allSnapshots.data.length - 1; i++) {
    TestValidator.predicate(
      `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
      allSnapshots.data[i].created_at >= allSnapshots.data[i + 1].created_at,
    );
  }
  // 6. Test pagination with limit
  const limit = 2;
  const paginatedSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSnapshots.data.length,
    Math.min(limit, paginatedSnapshots.pagination.records),
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSnapshots.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    paginatedSnapshots.pagination.pages >= 0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const filteredSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          from: oneHourAgo.toISOString(),
          to: oneHourFromNow.toISOString(),
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // All returned snapshots should be within the date range
  TestValidator.predicate(
    "filtered snapshots within date range",
    filteredSnapshots.data.every(
      (snapshot) =>
        new Date(snapshot.created_at) >= oneHourAgo &&
        new Date(snapshot.created_at) <= oneHourFromNow,
    ),
  );
}