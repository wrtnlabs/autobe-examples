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
 * Test updating an existing SKU variant's pricing information including base
 * price, compare-at price, and sale price with time windows.
 *
 * This test validates that sellers can modify pricing for market adjustments
 * while maintaining business rule compliance such as minimum price thresholds
 * and valid price relationships (sale_price < base_price, compare_at_price >=
 * base_price).
 *
 * The test verifies successful price updates, proper timestamp handling for
 * sale windows, and that the updated pricing is immediately reflected in the
 * SKU details.
 *
 * Test Flow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates initial SKU variant with base pricing
 * 6. Seller updates SKU with new pricing (base, compare-at, sale prices)
 * 7. Validate updated pricing and time windows
 */
export async function test_api_sku_update_price_adjustment(
  connection: api.IConnection,
) {
  // 1. Create and authenticate seller account
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create and authenticate admin account
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

  // 3. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Switch to seller and create product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 5. Create initial SKU variant with base pricing
  const initialBasePrice = 99.99;
  const skuCode = RandomGenerator.alphaNumeric(10);

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({ color: "blue", size: "M" }),
        base_price: initialBasePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Validate initial SKU creation
  TestValidator.equals("initial SKU code matches", sku.sku_code, skuCode);
  TestValidator.equals(
    "initial base price is set",
    sku.base_price,
    initialBasePrice,
  );

  // 6. Update SKU with new pricing structure
  const newBasePrice = 149.99;
  const compareAtPrice = 199.99;
  const salePrice = 119.99;
  const now = new Date();
  const saleStartAt = now.toISOString();
  const saleEndAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedSku = await api.functional.shoppingMall.seller.sales.skus.update(
    connection,
    {
      saleCode: sale.code,
      skuCode: skuCode,
      body: {
        base_price: newBasePrice,
        compare_at_price: compareAtPrice,
        sale_price: salePrice,
        sale_start_at: saleStartAt,
        sale_end_at: saleEndAt,
      } satisfies IShoppingMallSaleSku.IUpdate,
    },
  );
  typia.assert(updatedSku);

  // 7. Validate updated pricing and business rules
  TestValidator.equals(
    "updated base price matches",
    updatedSku.base_price,
    newBasePrice,
  );
  TestValidator.equals(
    "compare-at price is set",
    updatedSku.compare_at_price,
    compareAtPrice,
  );
  TestValidator.equals("sale price is set", updatedSku.sale_price, salePrice);
  TestValidator.equals(
    "sale start time is set",
    updatedSku.sale_start_at,
    saleStartAt,
  );
  TestValidator.equals(
    "sale end time is set",
    updatedSku.sale_end_at,
    saleEndAt,
  );

  // Validate price relationships (business rules)
  if (updatedSku.sale_price !== null && updatedSku.sale_price !== undefined) {
    TestValidator.predicate(
      "sale price is less than base price",
      updatedSku.sale_price < updatedSku.base_price,
    );
  }

  if (
    updatedSku.compare_at_price !== null &&
    updatedSku.compare_at_price !== undefined
  ) {
    TestValidator.predicate(
      "compare-at price is greater than or equal to base price",
      updatedSku.compare_at_price >= updatedSku.base_price,
    );
  }

  // Validate SKU identity remains unchanged
  TestValidator.equals(
    "SKU code unchanged after update",
    updatedSku.sku_code,
    skuCode,
  );
  TestValidator.equals("SKU ID unchanged after update", updatedSku.id, sku.id);
}
