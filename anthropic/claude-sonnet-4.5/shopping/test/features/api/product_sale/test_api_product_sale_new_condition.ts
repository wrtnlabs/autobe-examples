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
 * Test creating a product sale with condition='new' for brand new products.
 *
 * This scenario validates that new products are correctly classified for buyer
 * transparency. Authenticate as admin to create category, authenticate as
 * seller, then create product with condition='new' indicating unused product in
 * original packaging. Verify that the sale is created with condition='new' and
 * that this classification is visible to buyers to set appropriate expectations
 * about product state.
 *
 * Business Flow:
 *
 * 1. Admin registration and authentication
 * 2. Category creation for product organization
 * 3. Seller registration and authentication
 * 4. Product sale creation with condition='new'
 * 5. Validation of condition classification
 */
export async function test_api_product_sale_new_condition(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale with condition='new'
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    brand: RandomGenerator.name(1),
    condition: "new",
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    return_policy_days: 30,
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Validate sale creation and condition='new' classification
  TestValidator.equals("sale condition is new", sale.condition, "new");
  TestValidator.equals("sale code matches", sale.code, saleData.code);
  TestValidator.equals("sale title matches", sale.title, saleData.title);
  TestValidator.equals("sale category matches", sale.category.id, category.id);
  TestValidator.equals("sale seller matches", sale.seller.id, seller.id);
  TestValidator.equals(
    "sale return policy matches",
    sale.return_policy_days,
    30,
  );
}
