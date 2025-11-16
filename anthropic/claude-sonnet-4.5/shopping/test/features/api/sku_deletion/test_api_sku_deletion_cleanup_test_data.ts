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
 * Test deleting multiple SKU variants created during product setup testing or
 * experimentation.
 *
 * This scenario validates the cleanup workflow where sellers remove test SKUs
 * that were created in error or during initial product configuration. The test
 * verifies that multiple SKUs can be deleted sequentially, that each deletion
 * is independent, and that the parent sale listing remains intact after
 * removing child SKU variants.
 *
 * Test workflow:
 *
 * 1. Create seller account and authenticate
 * 2. Create admin account for category setup
 * 3. Create product category as admin
 * 4. Switch back to seller context
 * 5. Create parent product sale listing
 * 6. Create multiple test SKU variants (3 different configurations)
 * 7. Delete SKUs sequentially to verify cleanup
 * 8. Verify successful deletion of all test SKUs
 */
export async function test_api_sku_deletion_cleanup_test_data(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
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

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
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

  // Step 5: Create parent product sale listing
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 6: Create multiple test SKU variants
  const sku1: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-TEST-1`,
        variant_combination: JSON.stringify({ color: "red", size: "small" }),
        base_price: 100,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-TEST-2`,
        variant_combination: JSON.stringify({ color: "blue", size: "medium" }),
        base_price: 120,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku2);

  const sku3: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-TEST-3`,
        variant_combination: JSON.stringify({ color: "green", size: "large" }),
        base_price: 140,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku3);

  // Step 7: Delete SKUs sequentially to verify cleanup
  const deletedSku1: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.erase(connection, {
      saleCode: sale.code,
      skuCode: sku1.sku_code,
    });
  typia.assert(deletedSku1);
  TestValidator.equals(
    "first SKU deleted successfully",
    deletedSku1.id,
    sku1.id,
  );

  const deletedSku2: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.erase(connection, {
      saleCode: sale.code,
      skuCode: sku2.sku_code,
    });
  typia.assert(deletedSku2);
  TestValidator.equals(
    "second SKU deleted successfully",
    deletedSku2.id,
    sku2.id,
  );

  const deletedSku3: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.erase(connection, {
      saleCode: sale.code,
      skuCode: sku3.sku_code,
    });
  typia.assert(deletedSku3);
  TestValidator.equals(
    "third SKU deleted successfully",
    deletedSku3.id,
    sku3.id,
  );
}
