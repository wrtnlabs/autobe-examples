import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete buyer purchase workflow from seller product setup through
 * order creation.
 *
 * This test validates the end-to-end flow of a buyer purchasing a product,
 * including seller account setup, product listing creation, SKU variant
 * configuration, inventory initialization, buyer account setup, cart
 * management, and order completion.
 *
 * Due to API limitations (no reservation ID exposure in responses, no buyer
 * address/payment method creation endpoints), this test focuses on validating
 * the successful completion of the purchase workflow rather than reservation
 * retrieval.
 *
 * Workflow:
 *
 * 1. Create seller account and authenticate
 * 2. Create product sale listing
 * 3. Create SKU variant with pricing
 * 4. Initialize inventory stock for the SKU
 * 5. Create buyer account and authenticate
 * 6. Add item to cart (creates inventory reservation)
 * 7. Complete order creation (converts reservation)
 * 8. Validate successful order creation
 */
export async function test_api_inventory_reservation_seller_retrieval_converted(
  connection: api.IConnection,
) {
  // 1. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 8 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
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

  // 3. Create SKU variant
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<50000>
  >() satisfies number as number;
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: basePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Initialize inventory stock
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >() satisfies number as number;
  const inventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialQuantity,
          low_stock_threshold: 5,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Validate inventory was initialized correctly
  TestValidator.equals(
    "inventory total quantity matches input",
    inventoryStock.total_quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "inventory available quantity equals total initially",
    inventoryStock.available_quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "inventory reserved quantity is zero initially",
    inventoryStock.reserved_quantity,
    0,
  );

  // 5. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 6. Add item to cart (creates active inventory reservation)
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >() satisfies number as number;
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: cartQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Validate cart item was created correctly
  TestValidator.equals(
    "cart item SKU matches created SKU",
    cartItem.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "cart item quantity matches requested quantity",
    cartItem.quantity,
    cartQuantity,
  );
  TestValidator.equals(
    "cart item buyer matches authenticated buyer",
    cartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  // 7. Create order from cart (converts reservation to completed)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: typia.random<string & tags.Format<"uuid">>(),
        payment_method_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 8. Validate successful order creation
  TestValidator.equals(
    "order buyer matches authenticated buyer",
    order.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.predicate(
    "order has valid order number",
    order.order_number.length > 0,
  );
  TestValidator.predicate("order contains items", order.items.length > 0);
  TestValidator.equals(
    "order item quantity matches cart quantity",
    order.items[0].quantity,
    cartQuantity,
  );
  TestValidator.equals(
    "order item SKU matches purchased SKU",
    order.items[0].shopping_mall_sale_sku_id,
    sku.id,
  );
}
