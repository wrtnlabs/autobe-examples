import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test creating multiple distinct SKU variants within the same product sale
 * listing.
 *
 * This test validates the core multi-variant product model where a single
 * product sale can have multiple SKUs representing different attribute
 * combinations. It verifies that multiple SKUs can be created for the same
 * sale, each with unique sku_code and unique variant_combination JSON
 * structures.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as seller
 * 2. Switch to admin to create product category
 * 3. Switch back to seller to create parent sale listing
 * 4. Create 4 different SKU variants with different combinations
 * 5. Verify all SKUs were created with correct associations
 */
export async function test_api_sku_creation_multiple_variants_same_sale(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as seller
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

  // Step 2: Create admin and switch to admin role for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller for sale creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create parent product sale listing
  const saleCode = `SALE-${RandomGenerator.alphaNumeric(8)}`;
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create multiple SKU variants with different combinations
  const variantCombinations = [
    { Color: "Red", Size: "Small" },
    { Color: "Red", Size: "Large" },
    { Color: "Blue", Size: "Small" },
    { Color: "Blue", Size: "Large" },
  ];

  const skuCodes = [
    `${saleCode}-RED-S`,
    `${saleCode}-RED-L`,
    `${saleCode}-BLUE-S`,
    `${saleCode}-BLUE-L`,
  ];

  const basePrices = [29.99, 34.99, 31.99, 36.99];
  const enabledStatuses = [true, true, false, true];

  const createdSkus: IShoppingMallSaleSku[] = [];

  for (let i = 0; i < 4; i++) {
    const sku = await api.functional.shoppingMall.seller.sales.skus.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          sku_code: skuCodes[i],
          variant_combination: JSON.stringify(variantCombinations[i]),
          base_price: basePrices[i],
          enabled: enabledStatuses[i],
        } satisfies IShoppingMallSaleSku.ICreate,
      },
    );
    typia.assert(sku);
    createdSkus.push(sku);
  }

  // Step 7: Validate all SKUs were created successfully
  TestValidator.equals(
    "created SKU count matches expected",
    createdSkus.length,
    4,
  );

  // Step 8: Verify each SKU has correct properties
  for (let i = 0; i < createdSkus.length; i++) {
    const sku = createdSkus[i];

    TestValidator.equals(
      `SKU ${i + 1} code is correct`,
      sku.sku_code,
      skuCodes[i],
    );

    TestValidator.equals(
      `SKU ${i + 1} belongs to correct sale`,
      sku.shopping_mall_sale_id,
      sale.id,
    );

    TestValidator.equals(
      `SKU ${i + 1} has correct price`,
      sku.base_price,
      basePrices[i],
    );

    TestValidator.equals(
      `SKU ${i + 1} has correct enabled status`,
      sku.enabled,
      enabledStatuses[i],
    );

    TestValidator.equals(
      `SKU ${i + 1} has correct variant combination`,
      sku.variant_combination,
      JSON.stringify(variantCombinations[i]),
    );
  }

  // Step 9: Verify all SKU codes are unique
  const uniqueSkuCodes = new Set(createdSkus.map((sku) => sku.sku_code));
  TestValidator.equals("all SKU codes are unique", uniqueSkuCodes.size, 4);

  // Step 10: Verify all variant combinations are unique
  const uniqueVariantCombinations = new Set(
    createdSkus.map((sku) => sku.variant_combination),
  );
  TestValidator.equals(
    "all variant combinations are unique",
    uniqueVariantCombinations.size,
    4,
  );
}
