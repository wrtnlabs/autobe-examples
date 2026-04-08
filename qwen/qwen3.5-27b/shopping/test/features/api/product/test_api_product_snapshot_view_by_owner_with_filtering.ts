import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can view the complete edit history of their own product through the snapshots endpoint with various filtering options.
 *
 * Validates the product snapshot viewing functionality including authentication, snapshot retrieval, and filtering capabilities. Ensures that sellers can access the audit trail of their product modifications with proper pagination and field-based filtering.
 *
 * Special attention is given to verifying that snapshots contain complete before/after values for changed fields, include embedded seller information, and that filtering by changedField and date range works correctly.
 *
 * 1. Seller registers and authenticates using the join endpoint.
 * 2. Seller creates a product with initial attributes.
 * 3. Seller retrieves all snapshots for the product with empty filter.
 * 4. Seller retrieves snapshots filtered by changedField='name'.
 * 5. Seller retrieves snapshots filtered by changedField='price'.
 * 6. Seller retrieves snapshots filtered by date range.
 * 7. Validates pagination metadata and snapshot structure in all responses.
 */
export async function test_api_product_snapshot_view_by_owner_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Retrieve all snapshots with empty filter
  const allSnapshots: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allSnapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    allSnapshots.pagination.pages >= 0,
  );
  // Validate snapshot structure if data exists
  if (allSnapshots.data.length > 0) {
    const snapshot: IShoppingMallProductSnapshot.ISummary =
      allSnapshots.data[0];
    TestValidator.equals(
      "snapshot product_id matches",
      snapshot.product_id,
      product.id,
    );
    TestValidator.predicate(
      "snapshot has seller information",
      snapshot.seller !== null && snapshot.seller.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
  }
  // 4. Retrieve snapshots filtered by changedField='name'
  const nameFilteredSnapshots: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          changedField: "name",
        },
      },
    );
  typia.assert(nameFilteredSnapshots);
  // Validate name-filtered snapshots
  TestValidator.predicate(
    "name-filtered pagination has valid current page",
    nameFilteredSnapshots.pagination.current >= 1,
  );
  if (nameFilteredSnapshots.data.length > 0) {
    for (const snapshot of nameFilteredSnapshots.data) {
      TestValidator.predicate(
        "name-filtered snapshot has name changes",
        snapshot.name_before !== null || snapshot.name_after !== null,
      );
    }
  }
  // 5. Retrieve snapshots filtered by changedField='price'
  const priceFilteredSnapshots: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          changedField: "price",
        },
      },
    );
  typia.assert(priceFilteredSnapshots);
  // Validate price-filtered snapshots
  TestValidator.predicate(
    "price-filtered pagination has valid current page",
    priceFilteredSnapshots.pagination.current >= 1,
  );
  if (priceFilteredSnapshots.data.length > 0) {
    for (const snapshot of priceFilteredSnapshots.data) {
      TestValidator.predicate(
        "price-filtered snapshot has price changes",
        snapshot.base_price_before !== null ||
          snapshot.base_price_after !== null,
      );
    }
  }
  // 6. Retrieve snapshots filtered by date range
  const now: Date = new Date();
  const pastDate: Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const dateFilteredSnapshots: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          dateFrom: pastDate.toISOString(),
          dateTo: now.toISOString(),
        },
      },
    );
  typia.assert(dateFilteredSnapshots);
  // Validate date-filtered snapshots
  TestValidator.predicate(
    "date-filtered pagination has valid current page",
    dateFilteredSnapshots.pagination.current >= 1,
  );
  if (dateFilteredSnapshots.data.length > 0) {
    for (const snapshot of dateFilteredSnapshots.data) {
      const snapshotDate: Date = new Date(snapshot.created_at);
      TestValidator.predicate(
        "date-filtered snapshot is within range",
        snapshotDate >= pastDate && snapshotDate <= now,
      );
    }
  }
  // 7. Test pagination with limit parameter
  const paginatedSnapshots: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  // Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginatedSnapshots.data.length <= 10,
  );
}
