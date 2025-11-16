import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller authorization and data isolation in multi-seller order scenarios.
 *
 * This test validates that in orders containing items from multiple sellers,
 * each seller can only access their own items and cannot view items from other
 * sellers. This ensures proper multi-tenant data isolation for order
 * fulfillment and prevents sellers from accessing competitor information.
 *
 * Test Flow:
 *
 * 1. Create admin account and shared product categories
 * 2. Create three independent seller accounts (Seller A, B, C)
 * 3. Each seller creates their own product listings in shared categories
 * 4. Create buyer account and add items from all three sellers to cart
 * 5. Buyer creates order containing items from all sellers
 * 6. Each seller authenticates and retrieves order items
 * 7. Validate that each seller sees only their own items
 * 8. Verify seller_id filtering enforces authorization boundaries
 */
export async function test_api_seller_order_items_multi_seller_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and shared category
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

  // Create shared category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Create three independent seller accounts
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "password123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `Store_A_${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "password123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `Store_B_${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  const sellerCEmail = typia.random<string & tags.Format<"email">>();
  const sellerC = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerCEmail,
      password: "password123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `Store_C_${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerC);

  // Step 3: Each seller creates product listings
  // Seller A creates product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleA = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE_A_${RandomGenerator.alphaNumeric(6)}`,
        shopping_mall_category_id: category.id,
        title: `Product A - ${RandomGenerator.name(3)}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleA);

  const skuA = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleA.code,
      body: {
        sku_code: `SKU_A_${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Red" }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<5000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuA);

  // Seller B creates product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleB = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE_B_${RandomGenerator.alphaNumeric(6)}`,
        shopping_mall_category_id: category.id,
        title: `Product B - ${RandomGenerator.name(3)}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleB);

  const skuB = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleB.code,
      body: {
        sku_code: `SKU_B_${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Blue" }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<5000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuB);

  // Seller C creates product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleC = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE_C_${RandomGenerator.alphaNumeric(6)}`,
        shopping_mall_category_id: category.id,
        title: `Product C - ${RandomGenerator.name(3)}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 7,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleC);

  const skuC = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleC.code,
      body: {
        sku_code: `SKU_C_${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Green" }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<5000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuC);

  // Step 4: Create buyer account and add items from all sellers to cart
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: "password123",
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Add items from all three sellers to cart
  const cartItemA =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuA.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);

  const cartItemB =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuB.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);

  const cartItemC =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuC.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemC);

  // Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 5: Create multi-seller order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItemA.id, cartItemB.id, cartItemC.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Verify order contains items from all three sellers
  TestValidator.equals(
    "order should have 3 items total",
    order.items.length,
    3,
  );

  // Step 6: Seller A retrieves their items only
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerAItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerA.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerAItems);

  // Validate Seller A sees only their items
  TestValidator.equals(
    "Seller A should see only 1 item",
    sellerAItems.data.length,
    1,
  );
  TestValidator.equals(
    "Seller A item should be SKU A",
    sellerAItems.data[0].shopping_mall_sale_sku_id,
    skuA.id,
  );
  TestValidator.equals(
    "Seller A item quantity",
    sellerAItems.data[0].quantity,
    2,
  );

  // Step 7: Seller B retrieves their items only
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerBItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerB.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerBItems);

  // Validate Seller B sees only their items
  TestValidator.equals(
    "Seller B should see only 1 item",
    sellerBItems.data.length,
    1,
  );
  TestValidator.equals(
    "Seller B item should be SKU B",
    sellerBItems.data[0].shopping_mall_sale_sku_id,
    skuB.id,
  );
  TestValidator.equals(
    "Seller B item quantity",
    sellerBItems.data[0].quantity,
    1,
  );

  // Step 8: Seller C retrieves their items only
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerCItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerC.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerCItems);

  // Validate Seller C sees only their items
  TestValidator.equals(
    "Seller C should see only 1 item",
    sellerCItems.data.length,
    1,
  );
  TestValidator.equals(
    "Seller C item should be SKU C",
    sellerCItems.data[0].shopping_mall_sale_sku_id,
    skuC.id,
  );
  TestValidator.equals(
    "Seller C item quantity",
    sellerCItems.data[0].quantity,
    3,
  );

  // Step 9: Verify cross-seller isolation - Seller A cannot see Seller B's items
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerATryingBFilter =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerB.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerATryingBFilter);

  // Seller A with Seller B's filter should see empty results (authorization enforcement)
  TestValidator.equals(
    "Seller A filtering by Seller B ID should see empty results",
    sellerATryingBFilter.data.length,
    0,
  );

  // Step 10: Verify no filter returns only authenticated seller's items
  const sellerANoFilter =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {} satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerANoFilter);

  // Without explicit filter, should still only see own items (implicit authorization)
  TestValidator.equals(
    "Seller A without filter should see only their items",
    sellerANoFilter.data.length,
    1,
  );
  TestValidator.equals(
    "Seller A no-filter item should be SKU A",
    sellerANoFilter.data[0].shopping_mall_sale_sku_id,
    skuA.id,
  );
}
