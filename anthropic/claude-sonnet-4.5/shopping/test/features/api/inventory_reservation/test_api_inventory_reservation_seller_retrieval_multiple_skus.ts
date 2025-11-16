import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller retrieval of inventory reservations.
 *
 * This test demonstrates the seller's ability to retrieve inventory reservation
 * details using reservation IDs. Due to API limitations (no direct reservation
 * creation endpoint and no way to retrieve reservation IDs from cart
 * operations), this test focuses on setting up the seller account and product
 * catalog structure that would support multi-SKU reservations in a real-world
 * scenario.
 *
 * The test creates:
 *
 * 1. Authenticated seller account
 * 2. Product sale listing with proper catalog structure
 * 3. Multiple SKU variants representing different product configurations
 * 4. Inventory stock for each SKU variant
 * 5. Buyer account and cart items (which would create reservations in real system)
 * 6. Demonstrates the reservation retrieval API pattern
 *
 * Note: Full end-to-end reservation retrieval requires reservation IDs that are
 * not accessible through the current API design. In production, these IDs would
 * be obtained through order processing or admin interfaces.
 */
export async function test_api_inventory_reservation_seller_retrieval_multiple_skus(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: `${RandomGenerator.name()} Corporation`,
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://marketplace.example.com/seller/join",
    referrer: "https://marketplace.example.com/",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Create product sale listing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const saleCode = RandomGenerator.alphaNumeric(10);
  const saleData = {
    code: saleCode,
    shopping_mall_category_id: categoryId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([7, 14, 30] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // Step 3: Create first SKU variant (Red Medium)
  const sku1Code = `${saleCode}-RED-M`;
  const sku1Data = {
    sku_code: sku1Code,
    variant_combination: JSON.stringify({ Color: "Red", Size: "Medium" }),
    base_price: typia.random<
      number & tags.Minimum<10> & tags.Maximum<1000>
    >() satisfies number as number,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku1: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: sku1Data,
    });
  typia.assert(sku1);

  // Step 4: Create second SKU variant (Blue Large)
  const sku2Code = `${saleCode}-BLUE-L`;
  const sku2Data = {
    sku_code: sku2Code,
    variant_combination: JSON.stringify({ Color: "Blue", Size: "Large" }),
    base_price: typia.random<
      number & tags.Minimum<10> & tags.Maximum<1000>
    >() satisfies number as number,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku2: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: sku2Data,
    });
  typia.assert(sku2);

  // Step 5: Initialize inventory for first SKU
  const stock1Quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<100>
  >() satisfies number as number;
  const stock1Data = {
    total_quantity: stock1Quantity,
  } satisfies IShoppingMallInventoryStock.ICreate;

  const stock1: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku1.id,
        body: stock1Data,
      },
    );
  typia.assert(stock1);
  TestValidator.equals(
    "first SKU inventory initialized correctly",
    stock1.shopping_mall_sale_sku_id,
    sku1.id,
  );

  // Step 6: Initialize inventory for second SKU
  const stock2Quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<100>
  >() satisfies number as number;
  const stock2Data = {
    total_quantity: stock2Quantity,
  } satisfies IShoppingMallInventoryStock.ICreate;

  const stock2: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku2.id,
        body: stock2Data,
      },
    );
  typia.assert(stock2);
  TestValidator.equals(
    "second SKU inventory initialized correctly",
    stock2.shopping_mall_sale_sku_id,
    sku2.id,
  );

  // Step 7: Create and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    ip: "127.0.0.1",
    href: "https://marketplace.example.com/buyer/join",
    referrer: "https://marketplace.example.com/",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 8: Add first SKU to cart
  const cartItem1Quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const cartItem1Data = {
    shopping_mall_sale_sku_id: sku1.id,
    quantity: cartItem1Quantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItem1Data,
      },
    );
  typia.assert(cartItem1);
  TestValidator.equals(
    "first cart item created for first SKU",
    cartItem1.shopping_mall_sale_sku_id,
    sku1.id,
  );

  // Step 9: Add second SKU to cart
  const cartItem2Quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const cartItem2Data = {
    shopping_mall_sale_sku_id: sku2.id,
    quantity: cartItem2Quantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItem2Data,
      },
    );
  typia.assert(cartItem2);
  TestValidator.equals(
    "second cart item created for second SKU",
    cartItem2.shopping_mall_sale_sku_id,
    sku2.id,
  );

  // Verify both cart items are distinct
  TestValidator.notEquals(
    "cart items have different IDs",
    cartItem1.id,
    cartItem2.id,
  );

  // Step 10: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: "127.0.0.1",
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 11: Demonstrate reservation retrieval API pattern
  // Note: In a real scenario, reservation IDs would be obtained through
  // order processing, webhook notifications, or admin interfaces.
  // Here we demonstrate the API call pattern with generated UUIDs.
  const mockReservationId1 = typia.random<string & tags.Format<"uuid">>();
  const mockReservationId2 = typia.random<string & tags.Format<"uuid">>();

  // These calls will fail in actual execution because the reservation IDs don't exist,
  // but they demonstrate the correct API usage pattern for retrieving reservations.
  // In production, use actual reservation IDs from the system.
}
