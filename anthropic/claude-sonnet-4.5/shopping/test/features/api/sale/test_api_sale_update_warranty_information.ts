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
 * Test warranty information management for product sales.
 *
 * This test validates that sellers can add or modify warranty information for
 * their products to increase buyer confidence and clarify coverage terms. The
 * workflow demonstrates creating a product without warranty initially, then
 * updating it to include comprehensive warranty details covering duration,
 * coverage scope, and claim procedures.
 *
 * Steps:
 *
 * 1. Admin creates account and authenticates
 * 2. Admin creates product category
 * 3. Seller creates account and authenticates
 * 4. Seller creates product without warranty information
 * 5. Seller updates product to add comprehensive warranty details
 * 6. Verify warranty information is correctly stored and accessible
 */
export async function test_api_sale_update_warranty_information(
  connection: api.IConnection,
) {
  // Step 1: Admin creates account and authenticates
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
      href: "https://admin.marketplace.com/register",
      referrer: "https://admin.marketplace.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller creates account and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.com/seller/register",
      referrer: "https://marketplace.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product WITHOUT warranty information
  const productCode = RandomGenerator.alphaNumeric(12);

  const initialSale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: productCode,
        shopping_mall_category_id: category.id,
        title: "Smartphone XYZ Pro",
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: "TechBrand",
        condition: "new",
        return_policy_days: 30,
        warranty_info: null,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(initialSale);

  // Verify initial product has no warranty
  TestValidator.equals(
    "initial product has no warranty",
    initialSale.warranty_info,
    null,
  );

  // Step 5: Seller updates product to ADD comprehensive warranty details
  const comprehensiveWarranty =
    "Limited Warranty: 2 years manufacturer warranty covering defects in materials and workmanship. Coverage includes hardware component failures, manufacturing defects, and battery performance issues. Excludes physical damage, liquid damage, and normal wear and tear. To claim warranty: contact customer support with proof of purchase, describe the issue, and receive repair or replacement authorization within 5 business days.";

  const updatedSale = await api.functional.shoppingMall.seller.sales.update(
    connection,
    {
      saleCode: productCode,
      body: {
        warranty_info: comprehensiveWarranty,
      } satisfies IShoppingMallSale.IUpdate,
    },
  );
  typia.assert(updatedSale);

  // Step 6: Verify warranty information is correctly stored
  TestValidator.equals(
    "warranty information successfully added",
    updatedSale.warranty_info,
    comprehensiveWarranty,
  );
}
