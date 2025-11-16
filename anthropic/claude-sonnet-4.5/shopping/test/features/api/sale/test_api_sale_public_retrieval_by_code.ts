import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public retrieval of product sale listings by unique business identifier
 * code.
 *
 * This test validates that published product sales can be retrieved publicly
 * without authentication using their unique business code. The test ensures the
 * GET endpoint returns complete sale information including product details,
 * seller summary, category information, and availability status.
 *
 * Test workflow:
 *
 * 1. Create admin account for category management
 * 2. Admin creates product category for classification
 * 3. Create seller account for product listing
 * 4. Seller creates published product sale listing
 * 5. Retrieve sale publicly using sale code without authentication
 * 6. Verify complete sale information is returned correctly
 */
export async function test_api_sale_public_retrieval_by_code(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = RandomGenerator.alphaNumeric(12);
  const createdSale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(createdSale);

  // Step 5: Retrieve sale publicly without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const retrievedSale = await api.functional.shoppingMall.sales.at(
    unauthConnection,
    {
      saleCode: saleCode,
    },
  );
  typia.assert(retrievedSale);

  // Step 6: Validate retrieved sale information
  TestValidator.equals("sale ID matches", retrievedSale.id, createdSale.id);
  TestValidator.equals("sale code matches", retrievedSale.code, saleCode);
  TestValidator.equals(
    "sale title matches",
    retrievedSale.title,
    createdSale.title,
  );
  TestValidator.equals(
    "sale description matches",
    retrievedSale.description,
    createdSale.description,
  );
  TestValidator.equals(
    "sale status matches",
    retrievedSale.status,
    "published",
  );

  // Verify seller summary is included
  TestValidator.equals("seller ID matches", retrievedSale.seller.id, seller.id);
  TestValidator.equals(
    "seller store name matches",
    retrievedSale.seller.store_name,
    seller.store_name,
  );

  // Verify category summary is included
  TestValidator.equals(
    "category ID matches",
    retrievedSale.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedSale.category.name,
    category.name,
  );
}
