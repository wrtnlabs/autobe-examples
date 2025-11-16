import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that unit price snapshot is correctly captured when adding items to
 * cart.
 *
 * This test validates the price snapshot functionality which ensures buyers are
 * informed of price changes between cart addition and checkout. The snapshot
 * captures the exact price at the moment of adding to cart, supporting
 * transparent pricing and buyer trust.
 *
 * Test flow:
 *
 * 1. Setup multi-actor authentication (buyer, admin, seller)
 * 2. Admin creates product category
 * 3. Seller creates product sale listing
 * 4. Seller creates SKU with base price only (no promotion)
 * 5. Buyer adds SKU to cart and verify snapshot captures base price
 * 6. Seller creates second SKU with active sale price (promotional pricing)
 * 7. Buyer adds promotional SKU to cart and verify snapshot captures sale price
 */
export async function test_api_cart_item_price_snapshot_capture(
  connection: api.IConnection,
) {
  // 1. Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Create and authenticate admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // 3. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Create and authenticate seller account for product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  await api.functional.auth.seller.join(connection, {
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

  // 5. Seller creates product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 6. Seller creates SKU with base price only (no promotional pricing)
  const basePriceOnly = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const skuWithBasePrice =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ color: "Blue", size: "Medium" }),
        base_price: basePriceOnly,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuWithBasePrice);

  // 7. Switch to buyer account
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 8. Buyer adds SKU with base price to cart
  const cartItemBasePrice =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuWithBasePrice.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemBasePrice);

  // 9. Validate that snapshot captured the base price correctly
  TestValidator.equals(
    "base price snapshot matches SKU base price",
    cartItemBasePrice.unit_price_snapshot,
    basePriceOnly,
  );

  // 10. Switch back to seller account to create promotional SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 11. Seller creates SKU with active sale price (promotional pricing)
  const basePrice = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const salePrice = (basePrice * 0.7) satisfies number as number;

  // Validate sale price is less than base price
  TestValidator.predicate(
    "sale price must be less than base price",
    salePrice < basePrice,
  );

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const skuWithSalePrice =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ color: "Red", size: "Large" }),
        base_price: basePrice,
        sale_price: salePrice,
        sale_start_at: yesterday.toISOString(),
        sale_end_at: tomorrow.toISOString(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuWithSalePrice);

  // 12. Switch back to buyer account
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 13. Buyer adds promotional SKU to cart
  const cartItemSalePrice =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuWithSalePrice.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemSalePrice);

  // 14. Validate that snapshot captured the sale price (not base price)
  TestValidator.equals(
    "sale price snapshot captures promotional price",
    cartItemSalePrice.unit_price_snapshot,
    salePrice,
  );

  // 15. Additional validation - snapshot should NOT equal base price for promotional SKU
  TestValidator.notEquals(
    "promotional snapshot differs from base price",
    cartItemSalePrice.unit_price_snapshot,
    basePrice,
  );
}
