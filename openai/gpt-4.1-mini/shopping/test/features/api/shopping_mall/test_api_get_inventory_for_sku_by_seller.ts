import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate the retrieval of inventory by SKU for seller.
 *
 * This comprehensive test covers the entire flow from user registration to
 * inventory lookup.
 *
 * 1. Seller registration via auth/seller/join
 * 2. Admin authentication and creation of a category
 * 3. Admin creates a seller account
 * 4. Seller creates a product associated with the created category
 * 5. Seller creates a SKU under the product
 * 6. Seller queries inventory by SKU ID using GET
 *    /shoppingMall/seller/inventory/{skuId}
 * 7. Validate that the inventory data matches expected schema and values
 */
export async function test_api_get_inventory_for_sku_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellingSellerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellingSellerEmail,
        password_hash: "safePasswordHash123!", // A secure password hash mock
        status: "active",
        company_name: "Test Seller Company",
        contact_name: "John Doe",
        phone_number: "+821012345678",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuth);

  // 2. Admin registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "adminPasswordHash456!",
        status: "active",
        full_name: "Admin User",
        phone_number: "+821098765432",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminPasswordHash456!",
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Create category
  const categoryName = "test-category" + Date.now();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: categoryName + "-code",
          name: categoryName,
          description: "Test category description",
          display_order: 1,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Admin creates seller account
  const createdSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "createdSellerPasswordHash",
        status: "active",
        company_name: "Created Seller Company",
        contact_name: "Seller Contact",
        phone_number: "+821012345679",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(createdSeller);

  // Switch to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellingSellerEmail,
      password: "safePasswordHash123!",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Seller creates a product
  const productName = "test-product" + Date.now();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: sellerAuth.id,
        code: productName + "-code",
        name: productName,
        description: "Test product description",
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Seller creates a SKU for the product
  const skuCode = "sku-" + Date.now();
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: skuCode,
        price: 10000,
        status: "active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 7. Seller retrieves inventory for the SKU
  const inventory: IShoppingMallInventory =
    await api.functional.shoppingMall.seller.inventory.at(connection, {
      skuId: sku.id,
    });
  typia.assert(inventory);

  TestValidator.predicate(
    `inventory matches SKU ID`,
    inventory.shopping_mall_sku_id === sku.id,
  );
  TestValidator.predicate(
    `inventory quantity is a number`,
    typeof inventory.quantity === "number" && inventory.quantity >= 0,
  );
  TestValidator.predicate(
    `inventory created_at is ISO string`,
    typeof inventory.created_at === "string" &&
      /^[\dT:-]+Z$/.test(inventory.created_at),
  );
  TestValidator.predicate(
    `inventory updated_at is ISO string`,
    typeof inventory.updated_at === "string" &&
      /^[\dT:-]+Z$/.test(inventory.updated_at),
  );
}
