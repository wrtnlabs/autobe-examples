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
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * E2E test validating the full workflow of inventory filtered and paginated
 * retrieval by an admin user in the shopping mall platform.
 *
 * The workflow covers:
 *
 * 1. Admin user account creation and authentication
 * 2. Product category creation
 * 3. Seller user account creation and authentication
 * 4. Seller creation by admin
 * 5. Product creation by admin under the created category and seller
 * 6. SKU creation for the product by seller
 * 7. Inventory query by admin with pagination and filters
 * 8. Validation of inventory response correctness for pagination and filters
 */
export async function test_api_inventory_filtered_paginated_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = typia.random<string>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPasswordHash,
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = typia.random<string>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPasswordHash,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 6. Admin creates seller (independent entity)
  const createdSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: typia.random<string>(),
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(createdSeller);

  // 7. Admin creates product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: createdSeller.id,
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 8. Seller creates SKUs for product
  const skuCount = 3;
  const skus: IShoppingMallSku[] = [];
  for (let i = 0; i < skuCount; i++) {
    const skuBody: IShoppingMallSku.ICreate = {
      shopping_mall_product_id: product.id,
      sku_code: `${product.code}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
      price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      weight: 0.5 + i,
      status: "active",
    };
    const sku = await api.functional.shoppingMall.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuBody,
      },
    );
    typia.assert(sku);
    skus.push(sku);
  }

  // 9. Admin queries the inventory with filters and pagination
  const filterSkuId = skus[0].id;
  const filterQuantity = 0;
  const paginationPage = 1;
  const paginationLimit = 10;

  const inventoryResponse: IPageIShoppingMallInventory.ISummary =
    await api.functional.shoppingMall.admin.inventory.index(connection, {
      body: {
        shopping_mall_sku_id: filterSkuId,
        quantity: filterQuantity,
        page: paginationPage,
        limit: paginationLimit,
      } satisfies IShoppingMallInventory.IRequest,
    });
  typia.assert(inventoryResponse);

  // 10. Validate response pagination
  TestValidator.predicate(
    "pagination current page is correct",
    inventoryResponse.pagination.current === paginationPage,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    inventoryResponse.pagination.limit === paginationLimit,
  );
  TestValidator.predicate(
    "pagination has non-negative total pages",
    inventoryResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative total records",
    inventoryResponse.pagination.records >= 0,
  );

  // 11. Validate inventory list filter matches the SKU ID filter
  for (const item of inventoryResponse.data) {
    TestValidator.equals(
      "inventory record has expected SKU ID",
      item.shopping_mall_sku_id,
      filterSkuId,
    );
    TestValidator.predicate(
      "inventory record quantity is greater or equal to filter",
      item.quantity >= filterQuantity,
    );
  }
}
