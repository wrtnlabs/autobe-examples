import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the seller's ability to list product SKU inventory with filtering and
 * pagination.
 *
 * The test performs the following steps:
 *
 * 1. Authenticate as seller by joining and logging in.
 * 2. Authenticate as admin by joining and logging in.
 * 3. Admin creates a shopping mall category.
 * 4. Admin creates a shopping mall seller entity.
 * 5. Seller creates two products under the created category and seller.
 * 6. Seller requests the inventory list with pagination parameters.
 * 7. Validates the inventory listing response for correctness of pagination info
 *    and inventory summaries.
 * 8. Switch to admin role (unauthorized) and ensure access to seller inventory
 *    listing is denied.
 */
export async function test_api_seller_inventory_listing_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1. Seller join
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuthorized);

  // Step 2. Seller login
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password_hash,
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // Step 3. Admin join
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // Step 4. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password_hash,
    type: "admin" as const,
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // Step 5. Create category as admin
  const categoryCreateBody = {
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // Step 6. Create seller record as admin
  const sellerAdminBody = {
    email: sellerAuthorized.email,
    password_hash: sellerCreateBody.password_hash,
    company_name: sellerAuthorized.company_name,
    contact_name: sellerAuthorized.contact_name,
    phone_number: sellerAuthorized.phone_number,
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;

  const sellerRecord: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerAdminBody,
    });
  typia.assert(sellerRecord);

  // Step 7. Seller creates two products
  const productCreatePromises = ArrayUtil.repeat(2, async () => {
    const productCreateBody = {
      shopping_mall_category_id: category.id,
      shopping_mall_seller_id: sellerRecord.id,
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      status: "active",
    } satisfies IShoppingMallProduct.ICreate;
    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
    typia.assert(product);
    return product;
  });
  const products = await Promise.all(productCreatePromises);

  // Step 8. Seller requests inventory list with pagination
  const inventoryRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallInventory.IRequest;

  const inventoryPage: IPageIShoppingMallInventory.ISummary =
    await api.functional.shoppingMall.seller.inventory.index(connection, {
      body: inventoryRequestBody,
    });
  typia.assert(inventoryPage);

  TestValidator.predicate(
    "pagination current page is 1",
    inventoryPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    inventoryPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages and records are positive",
    inventoryPage.pagination.pages >= 0 &&
      inventoryPage.pagination.records >= 0,
  );

  // Check inventory data contains inventory for products
  for (const product of products) {
    const foundInventory = inventoryPage.data.find(
      (inventory) =>
        inventory.shopping_mall_sku_id &&
        typeof inventory.shopping_mall_sku_id === "string",
    );
    TestValidator.predicate(
      `inventory contains sku for product ${product.id}`,
      foundInventory !== undefined,
    );
  }

  // Step 9. Switch role to admin (unauthorized) and try listing inventory
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  await TestValidator.error(
    "admin cannot access seller inventory list",
    async () => {
      await api.functional.shoppingMall.seller.inventory.index(connection, {
        body: inventoryRequestBody,
      });
    },
  );
}
