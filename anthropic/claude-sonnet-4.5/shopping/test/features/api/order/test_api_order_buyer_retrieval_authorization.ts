import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validates order retrieval authorization rules ensuring buyers can only access
 * their own orders.
 *
 * This test verifies that the order retrieval endpoint properly enforces
 * authorization boundaries, preventing buyers from accessing orders that belong
 * to other buyers. The test creates two separate buyer accounts, establishes a
 * complete order for Buyer A, and then validates that Buyer B cannot access
 * Buyer A's order while Buyer A can successfully retrieve their own order.
 *
 * Test workflow:
 *
 * 1. Register Buyer A and Buyer B accounts with stored passwords
 * 2. Setup product catalog (admin creates category, seller creates product and
 *    SKU)
 * 3. Buyer A completes full checkout flow (cart → address → payment → order)
 * 4. Buyer A successfully retrieves their own order (positive authorization test)
 * 5. Buyer B attempts to access Buyer A's order and is denied (negative
 *    authorization test)
 * 6. Test with non-existent order ID
 */
export async function test_api_order_buyer_retrieval_authorization(
  connection: api.IConnection,
) {
  // 1. Register Buyer A with stored password
  const buyerAEmail = typia.random<string & tags.Format<"email">>();
  const buyerAPassword = typia.random<string & tags.MinLength<8>>();
  const buyerA = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerAEmail,
      password: buyerAPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyerA);

  // 2. Register Buyer B with stored password (for cross-buyer authorization testing)
  const buyerBEmail = typia.random<string & tags.Format<"email">>();
  const buyerBPassword = typia.random<string & tags.MinLength<8>>();
  const buyerB = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerBEmail,
      password: buyerBPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyerB);

  // 3. Admin setup - Create category
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

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

  // 4. Seller setup - Create sale and SKU
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        variant_combination: JSON.stringify({ Color: "Red", Size: "M" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Switch to Buyer A - Complete checkout flow
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerAEmail,
      password: buyerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 6. Add product to Buyer A's cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 7. Create delivery address for Buyer A
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"int32"> &
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

  // 8. Register payment method for Buyer A
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 9. Create order for Buyer A
  const orderBuyerA = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderBuyerA);

  // 10. POSITIVE TEST: Buyer A retrieves their own order successfully
  const retrievedOrderByOwner =
    await api.functional.shoppingMall.buyer.orders.at(connection, {
      orderId: orderBuyerA.id,
    });
  typia.assert(retrievedOrderByOwner);
  TestValidator.equals(
    "buyer A can retrieve their own order ID",
    retrievedOrderByOwner.id,
    orderBuyerA.id,
  );
  TestValidator.equals(
    "order number matches",
    retrievedOrderByOwner.order_number,
    orderBuyerA.order_number,
  );
  TestValidator.equals(
    "buyer ID matches",
    retrievedOrderByOwner.shopping_mall_buyer_id,
    buyerA.id,
  );

  // 11. NEGATIVE TEST: Switch to Buyer B and attempt to access Buyer A's order
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerBEmail,
      password: buyerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Buyer B should NOT be able to access Buyer A's order - authorization denied
  await TestValidator.error(
    "buyer B cannot access buyer A's order due to authorization",
    async () => {
      await api.functional.shoppingMall.buyer.orders.at(connection, {
        orderId: orderBuyerA.id,
      });
    },
  );

  // 12. Test with non-existent order ID (still as Buyer B)
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent order ID returns error", async () => {
    await api.functional.shoppingMall.buyer.orders.at(connection, {
      orderId: nonExistentOrderId,
    });
  });
}
