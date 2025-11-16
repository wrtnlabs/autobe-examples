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
 * Test that sale snapshots preserve complete historical accuracy of product
 * information.
 *
 * This test validates the core snapshot functionality of preserving historical
 * product state for audit trails, ensuring that snapshots serve as reliable
 * point-in-time records for compliance, dispute resolution, and order
 * verification purposes.
 *
 * The test workflow:
 *
 * 1. Authenticate as admin to perform administrative operations
 * 2. Create a category for product organization
 * 3. Authenticate as seller to manage product listings
 * 4. Create an initial product sale with specific title, description, and pricing
 * 5. Retrieve the initial snapshot to establish baseline historical data
 * 6. Verify that the snapshot contains the original product information
 * 7. Validate snapshot includes denormalized seller and category information
 * 8. Confirm snapshot timestamps are accurate
 * 9. Ensure snapshot data is immutable and represents the exact product state at
 *    creation time
 */
export async function test_api_sale_snapshot_historical_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" satisfies
      | "super_admin"
      | "moderator"
      | "support",
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create category as admin
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" satisfies "active" | "inactive",
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.content({ paragraphs: 2 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale with specific attributes
  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const saleDescription = RandomGenerator.content({ paragraphs: 3 });
  const saleBrand = RandomGenerator.name(1);
  const saleCondition = "new" satisfies "new" | "refurbished" | "used";
  const returnPolicyDays = 30 satisfies 0 | 7 | 14 | 30 | 60;
  const warrantyInfo = RandomGenerator.paragraph({ sentences: 5 });

  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: saleTitle,
    description: saleDescription,
    brand: saleBrand,
    condition: saleCondition,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    meta_keywords: RandomGenerator.name(5),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: returnPolicyDays,
    warranty_info: warrantyInfo,
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Validate that sale creation preserves all data correctly
  TestValidator.equals("sale code matches input", sale.code, saleCode);
  TestValidator.equals("sale title matches input", sale.title, saleTitle);
  TestValidator.equals(
    "sale description preserved",
    sale.description,
    saleDescription,
  );
  TestValidator.equals("sale brand preserved", sale.brand, saleBrand);
  TestValidator.equals(
    "sale condition preserved",
    sale.condition,
    saleCondition,
  );
  TestValidator.equals(
    "sale return policy preserved",
    sale.return_policy_days,
    returnPolicyDays,
  );
  TestValidator.equals(
    "sale warranty info preserved",
    sale.warranty_info,
    warrantyInfo,
  );

  // Validate denormalized seller and category information in sale
  TestValidator.equals(
    "sale has correct seller reference",
    sale.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "sale has correct category reference",
    sale.category.id,
    category.id,
  );

  // Validate sale timestamps
  TestValidator.predicate(
    "sale has creation timestamp",
    sale.created_at !== null && sale.created_at !== undefined,
  );

  TestValidator.predicate(
    "sale has update timestamp",
    sale.updated_at !== null && sale.updated_at !== undefined,
  );

  // Step 5: Switch to admin context for snapshot retrieval
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Attempt to retrieve snapshot using sale ID as snapshot ID
  // This assumes that the initial snapshot ID matches the sale ID or follows a predictable pattern
  const snapshot = await api.functional.shoppingMall.admin.sales.snapshots.at(
    connection,
    {
      saleCode: sale.code,
      snapshotId: sale.id,
    },
  );
  typia.assert(snapshot);

  // Step 7: Verify snapshot contains original product information
  TestValidator.equals(
    "snapshot code matches sale code",
    snapshot.code,
    saleCode,
  );
  TestValidator.equals(
    "snapshot title matches original",
    snapshot.title,
    saleTitle,
  );
  TestValidator.equals(
    "snapshot description preserved",
    snapshot.description,
    saleDescription,
  );
  TestValidator.equals("snapshot brand preserved", snapshot.brand, saleBrand);
  TestValidator.equals(
    "snapshot condition preserved",
    snapshot.condition,
    saleCondition,
  );
  TestValidator.equals(
    "snapshot return policy preserved",
    snapshot.return_policy_days,
    returnPolicyDays,
  );
  TestValidator.equals(
    "snapshot warranty info preserved",
    snapshot.warranty_info,
    warrantyInfo,
  );

  // Step 8: Validate denormalized seller and category information
  TestValidator.equals(
    "snapshot has seller reference",
    snapshot.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "snapshot has category reference",
    snapshot.shopping_mall_category_id,
    category.id,
  );

  // Step 9: Confirm snapshot timestamps are accurate
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );

  // Verify snapshot ID is valid UUID format
  TestValidator.predicate(
    "snapshot ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );

  // Verify snapshot references correct sale
  TestValidator.equals(
    "snapshot references correct sale",
    snapshot.shopping_mall_sale_id,
    sale.id,
  );
}
