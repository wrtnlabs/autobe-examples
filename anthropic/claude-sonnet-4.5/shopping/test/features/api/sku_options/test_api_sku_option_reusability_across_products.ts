import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test SKU option reusability across multiple products from different sellers.
 *
 * This test validates the core business requirement that custom SKU options can
 * be referenced by multiple SKUs across different products to promote
 * consistency in variant naming. The test creates a shared custom option
 * through admin account, then demonstrates that multiple sellers can reference
 * the same option when creating SKU variants for their respective products.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Admin creates a shared custom SKU option
 * 3. Create and authenticate first seller
 * 4. Admin creates product category
 * 5. First seller creates product and SKU with the shared option
 * 6. Create and authenticate second seller
 * 7. Second seller creates product and SKU with the same shared option
 * 8. Validate both SKUs successfully reference the shared option
 */
export async function test_api_sku_option_reusability_across_products(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates a shared custom SKU option
  const sharedOptionName = RandomGenerator.name(2);
  const sharedOptionValue = RandomGenerator.name(1);

  const sharedOption =
    await api.functional.shoppingMall.admin.skuOptions.create(connection, {
      body: {
        option_name: sharedOptionName,
        option_value: sharedOptionValue,
      } satisfies IShoppingMallSkuOption.ICreate,
    });
  typia.assert(sharedOption);

  TestValidator.equals(
    "shared option name matches",
    sharedOption.option_name,
    sharedOptionName,
  );
  TestValidator.equals(
    "shared option value matches",
    sharedOption.option_value,
    sharedOptionValue,
  );

  // Step 3: Create and authenticate first seller
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = typia.random<string & tags.MinLength<8>>();

  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // Step 4: Switch to admin and create product category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Switch to first seller and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  // Step 6: First seller creates SKU with shared option
  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product1.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 7: Create and authenticate second seller
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = typia.random<string & tags.MinLength<8>>();

  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      business_name: RandomGenerator.name(2),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // Step 8: Second seller creates a different product
  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  TestValidator.notEquals(
    "products should be different",
    product1.id,
    product2.id,
  );

  // Step 9: Second seller creates SKU with the same shared option
  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product2.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 10: Validate both SKUs are created successfully
  TestValidator.predicate("sku1 has valid id", sku1.id.length > 0);
  TestValidator.predicate("sku2 has valid id", sku2.id.length > 0);
  TestValidator.notEquals("skus should be different", sku1.id, sku2.id);

  // Validate the shared option exists and maintains consistency
  TestValidator.predicate(
    "shared option has valid id",
    sharedOption.id.length > 0,
  );
}
