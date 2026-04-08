import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test filtering deleted products to support audit and compliance workflows.
 *
 * This test validates the admin deleted products search functionality including:
 * - Filtering by seller_id to find products deleted by specific sellers
 * - Filtering by deletion date range (deleted_at_from / deleted_at_to) for audit trails
 * - Combined filters for precise audit queries
 * - Pagination support for large result sets
 * - Partial name matching on deleted products
 */
export async function test_api_deleted_product_search_by_deletion_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller connection and create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a test product as the seller
  const productName = `Test Product ${RandomGenerator.alphaNumeric(8)}`;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Record the time before deletion for date filtering
  const beforeDeletionTime = new Date().toISOString();
  // 3. Delete the product (soft delete)
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // Record the time after deletion
  const afterDeletionTime = new Date().toISOString();
  // 4. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 5. Search deleted products filtering by seller_id
  const searchBySeller =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(searchBySeller);
  // Verify the deleted product is found
  TestValidator.predicate(
    "deleted product found by seller_id",
    searchBySeller.data.some((p) => p.id === product.id),
  );
  // 6. Test filtering by deletion date range (audit trail filtering)
  const searchByDateRange =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          deleted_at_from: beforeDeletionTime,
          deleted_at_to: afterDeletionTime,
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(searchByDateRange);
  // Verify the deleted product appears within the time range
  TestValidator.predicate(
    "deleted product found within deletion date range",
    searchByDateRange.data.some((p) => p.id === product.id),
  );
  // 7. Test combined filters: seller_id + date range
  const combinedSearch =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          deleted_at_from: beforeDeletionTime,
          deleted_at_to: afterDeletionTime,
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "product found with combined seller_id and date range filters",
    combinedSearch.data.some((p) => p.id === product.id),
  );
  // 8. Test pagination with limit and page
  const paginatedSearch =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  // 9. Test search by product name (partial match)
  const searchByName =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          name: productName.substring(0, 8),
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(searchByName);
  TestValidator.predicate(
    "product found by partial name match",
    searchByName.data.some((p) => p.id === product.id),
  );
  // 10. Test edge case: search with non-existent seller_id returns empty list
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptySearch =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          seller_id: nonExistentSellerId,
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "search with non-existent seller returns empty",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearch.pagination.records,
    0,
  );
  // 11. Test sorting by deleted_at in descending order (newest first)
  const sortedSearch =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          sort: "deleted_at:DESC",
        } satisfies IEcommerceMallProduct.IDeletedRequest,
      },
    );
  typia.assert(sortedSearch);
  // Verify the product is in the results when sorted
  TestValidator.predicate(
    "product found with sorting",
    sortedSearch.data.some((p) => p.id === product.id),
  );
}
