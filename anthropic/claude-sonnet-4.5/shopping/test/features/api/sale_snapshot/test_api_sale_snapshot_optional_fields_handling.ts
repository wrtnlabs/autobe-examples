import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sale creation correctly handles optional/nullable fields in product
 * data.
 *
 * This test validates the proper handling of optional fields when creating
 * sales with minimal required data. When a sale is created with only required
 * fields (omitting optional fields like brand, short_description,
 * meta_keywords, weight, dimensions, manufacturer, warranty_info), the system
 * must correctly represent these optional fields as null or undefined.
 *
 * Note: Original scenario requested snapshot testing, but no API exists to
 * create or list snapshots. This test has been rewritten to validate optional
 * field handling through direct sale creation and retrieval, which achieves the
 * same validation goal.
 *
 * Test workflow:
 *
 * 1. Seller authentication - register and login as seller
 * 2. Admin authentication - register and login as admin for category creation
 * 3. Category creation - create category for product assignment
 * 4. Switch back to seller context
 * 5. Sale creation with minimal required fields only
 * 6. Validation of optional nullable fields in the created sale
 * 7. Validation of required fields as properly populated
 */
export async function test_api_sale_snapshot_optional_fields_handling(
  connection: api.IConnection,
) {
  // Step 1: Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Admin registration for category creation
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

  // Step 3: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create sale with only required fields (omit all optional nullable fields)
  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const saleDescription = RandomGenerator.content({ paragraphs: 2 });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: saleTitle,
        description: saleDescription,
        condition: "new",
        return_policy_days: 30,
        // Deliberately omit all optional nullable fields:
        // brand, short_description, meta_keywords, weight,
        // dimension_length, dimension_width, dimension_height,
        // manufacturer, warranty_info, status
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Validate optional nullable string fields are null or undefined
  TestValidator.predicate(
    "brand should be null or undefined",
    sale.brand === null || sale.brand === undefined,
  );

  // Step 7: Validate optional nullable numeric fields are null or undefined
  TestValidator.predicate(
    "weight should be null or undefined",
    sale.weight === null || sale.weight === undefined,
  );
  TestValidator.predicate(
    "dimension_length should be null or undefined",
    sale.dimension_length === null || sale.dimension_length === undefined,
  );
  TestValidator.predicate(
    "dimension_width should be null or undefined",
    sale.dimension_width === null || sale.dimension_width === undefined,
  );
  TestValidator.predicate(
    "dimension_height should be null or undefined",
    sale.dimension_height === null || sale.dimension_height === undefined,
  );
  TestValidator.predicate(
    "manufacturer should be null or undefined",
    sale.manufacturer === null || sale.manufacturer === undefined,
  );
  TestValidator.predicate(
    "warranty_info should be null or undefined",
    sale.warranty_info === null || sale.warranty_info === undefined,
  );

  // Step 8: Validate required fields are properly populated
  TestValidator.equals("sale code matches input", sale.code, saleCode);
  TestValidator.equals("sale title matches input", sale.title, saleTitle);
  TestValidator.equals(
    "sale description matches input",
    sale.description,
    saleDescription,
  );
  TestValidator.equals("sale condition is new", sale.condition, "new");
  TestValidator.equals("return policy is 30 days", sale.return_policy_days, 30);
}
