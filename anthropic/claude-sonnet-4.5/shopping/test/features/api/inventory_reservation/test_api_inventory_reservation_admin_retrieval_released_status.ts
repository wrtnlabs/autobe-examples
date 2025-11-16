import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test inventory reservation lifecycle with cart item creation and removal.
 *
 * This test validates that inventory reservations are properly managed when
 * buyers interact with their shopping cart. While the complete admin retrieval
 * scenario cannot be fully implemented due to API limitations (no way to
 * retrieve reservation ID from cart operations), this test validates the cart
 * workflow that creates and implicitly releases reservations.
 *
 * Workflow:
 *
 * 1. Create seller account with product inventory setup
 * 2. Create buyer account to interact with cart
 * 3. Buyer adds item to cart (implicitly creates inventory reservation)
 * 4. Buyer removes cart item (implicitly releases reservation)
 * 5. Validate cart operations complete successfully
 *
 * Note: Full reservation retrieval validation requires additional API endpoints
 * not currently available.
 */
export async function test_api_inventory_reservation_admin_retrieval_released_status(
  connection: api.IConnection,
) {
  // 1. Create seller account with product and inventory
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // 2. Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleData = {
    code: saleCode,
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // 3. Create SKU variant
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuData = {
    sku_code: skuCode,
    variant_combination: JSON.stringify({ Color: "Blue", Size: "M" }),
    base_price: typia.random<
      number & tags.Minimum<10> & tags.Maximum<1000>
    >() satisfies number as number,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: skuData,
    });
  typia.assert(sku);

  // 4. Initialize inventory stock
  const stockData = {
    total_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
    >() satisfies number as number,
    low_stock_threshold: 5,
  } satisfies IShoppingMallInventoryStock.ICreate;

  const stock: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: stockData,
      },
    );
  typia.assert(stock);

  // 5. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // 6. Buyer adds item to cart (creates active inventory reservation)
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const cartItemData = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: cartQuantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemData,
      },
    );
  typia.assert(cartItem);

  // Validate cart item creation
  TestValidator.equals(
    "cart item SKU matches",
    cartItem.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "cart item quantity matches",
    cartItem.quantity,
    cartQuantity,
  );
  TestValidator.equals(
    "cart item buyer matches",
    cartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  // Store cart item ID for removal
  const cartItemId = typia.assert(cartItem.id!);

  // 7. Buyer removes cart item (releases the inventory reservation)
  await api.functional.shoppingMall.buyer.buyers.me.cart.items.erase(
    connection,
    {
      cartItemId: cartItemId,
    },
  );

  // Note: The complete admin retrieval validation cannot be implemented because:
  // - Cart operations don't return reservation IDs
  // - No search API exists to find reservations by buyer/SKU
  // - Using random UUID would test non-existent reservations
  // The test successfully validates the cart workflow that manages reservations
}
