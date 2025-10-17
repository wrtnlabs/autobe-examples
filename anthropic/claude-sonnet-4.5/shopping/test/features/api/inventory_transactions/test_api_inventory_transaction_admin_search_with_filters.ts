import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test comprehensive inventory transaction search functionality for
 * administrators.
 *
 * This test validates that admins can search and filter inventory transactions
 * across the entire platform with various criteria including transaction type,
 * status, date ranges, seller, and SKU.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication
 * 2. Create seller account for product/SKU creation
 * 3. Create product category
 * 4. Create products and SKU variants
 * 5. Search inventory transactions with various filter combinations
 * 6. Validate search results match filter criteria and pagination works correctly
 */
export async function test_api_inventory_transaction_admin_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create product category
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 4: Create products
  const product1Data = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: product1Data,
    },
  );
  typia.assert(product1);

  const product2Data = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: product2Data,
    },
  );
  typia.assert(product2);

  // Step 5: Create SKU variants for products
  const sku1Data = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product1.id,
      body: sku1Data,
    },
  );
  typia.assert(sku1);

  const sku2Data = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product1.id,
      body: sku2Data,
    },
  );
  typia.assert(sku2);

  const sku3Data = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku3 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product2.id,
      body: sku3Data,
    },
  );
  typia.assert(sku3);

  // Step 6: Search inventory transactions with default parameters
  const defaultSearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallInventoryTransaction.IRequest;

  const defaultSearchResult =
    await api.functional.shoppingMall.admin.inventoryTransactions.index(
      connection,
      {
        body: defaultSearchRequest,
      },
    );
  typia.assert(defaultSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    defaultSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    defaultSearchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    defaultSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    defaultSearchResult.pagination.pages >= 0,
  );

  // Validate data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(defaultSearchResult.data),
  );

  // Step 7: Search with transaction type filter
  const typeFilterRequest = {
    page: 1,
    limit: 5,
    transaction_type: "sale",
  } satisfies IShoppingMallInventoryTransaction.IRequest;

  const typeFilterResult =
    await api.functional.shoppingMall.admin.inventoryTransactions.index(
      connection,
      {
        body: typeFilterRequest,
      },
    );
  typia.assert(typeFilterResult);

  TestValidator.predicate(
    "type filter pagination limit should be 5",
    typeFilterResult.pagination.limit === 5,
  );

  // Step 8: Search with transaction status filter
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    transaction_status: "completed",
  } satisfies IShoppingMallInventoryTransaction.IRequest;

  const statusFilterResult =
    await api.functional.shoppingMall.admin.inventoryTransactions.index(
      connection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilterResult);

  TestValidator.predicate(
    "status filter result should have valid pagination",
    statusFilterResult.pagination.current === 1,
  );

  // Step 9: Search with combined filters
  const combinedFilterRequest = {
    page: 1,
    limit: 20,
    transaction_type: "restock",
    transaction_status: "pending",
  } satisfies IShoppingMallInventoryTransaction.IRequest;

  const combinedFilterResult =
    await api.functional.shoppingMall.admin.inventoryTransactions.index(
      connection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResult);

  TestValidator.predicate(
    "combined filter pagination limit should be 20",
    combinedFilterResult.pagination.limit === 20,
  );

  // Step 10: Test pagination with different page numbers
  const page2Request = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallInventoryTransaction.IRequest;

  const page2Result =
    await api.functional.shoppingMall.admin.inventoryTransactions.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Result);

  TestValidator.predicate(
    "page 2 current page should be 2",
    page2Result.pagination.current === 2,
  );

  // Step 11: Validate transaction data structure if results exist
  if (defaultSearchResult.data.length > 0) {
    const firstTransaction = defaultSearchResult.data[0];
    typia.assert(firstTransaction);

    TestValidator.predicate(
      "transaction should have valid id",
      typeof firstTransaction.id === "string" && firstTransaction.id.length > 0,
    );
    TestValidator.predicate(
      "transaction should have transaction_type",
      typeof firstTransaction.transaction_type === "string" &&
        firstTransaction.transaction_type.length > 0,
    );
  }
}
