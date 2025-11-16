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
 * Validate that sellers retrieve order items with accurate historical product
 * information captured at purchase time.
 *
 * This test ensures that order items preserve exact product snapshots from the
 * moment of purchase, maintaining fulfillment accuracy even when product
 * catalog details change. The test creates an order with specific product
 * configurations and validates that the seller can retrieve order items with
 * all historical fields intact.
 *
 * Test Workflow:
 *
 * 1. Admin creates product category
 * 2. Seller creates product sale with specific title and details
 * 3. Seller creates SKU variant with specific code, attributes, and pricing
 * 4. Buyer adds product to cart (capturing current state)
 * 5. Buyer creates delivery address
 * 6. Buyer registers payment method
 * 7. Buyer places order (creates purchase-time snapshot)
 * 8. Seller retrieves order items
 * 9. Validate all snapshot fields preserve purchase-time data accurately
 */
export async function test_api_seller_order_items_historical_data_accuracy(
  connection: api.IConnection,
) {
  // 1. Create admin account for category setup
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

  // 2. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller1234",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 4. Create product sale with specific known details
  const originalProductTitle = "Original Premium Wireless Headphones";
  const originalSaleCode = `SALE-${RandomGenerator.alphaNumeric(8)}`;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: originalSaleCode,
        shopping_mall_category_id: category.id,
        title: originalProductTitle,
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 5. Create SKU variant with specific known configuration
  const originalSkuCode = `SKU-BLACK-L-${RandomGenerator.alphaNumeric(6)}`;
  const originalVariantCombination = JSON.stringify({
    Color: "Black",
    Size: "Large",
  });
  const originalBasePrice = 199.99;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: originalSkuCode,
        variant_combination: originalVariantCombination,
        base_price: originalBasePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: "buyer1234",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 7. Buyer adds product to cart (capturing current state)
  const orderQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: orderQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 8. Buyer creates delivery address
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
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
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // 9. Buyer registers payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: "12345",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 10. Buyer places order (creates purchase-time snapshot)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 11. Switch to seller authentication for order item retrieval
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 12. Seller retrieves order items with historical snapshot data
  const orderItemsPage =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(orderItemsPage);

  // 13. Validate pagination metadata
  TestValidator.predicate(
    "order items page should have valid pagination",
    orderItemsPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "order items should be present",
    orderItemsPage.data.length > 0,
  );

  // 14. Find the specific order item for our SKU
  const orderItem = orderItemsPage.data.find(
    (item) => item.shopping_mall_sale_sku_id === sku.id,
  );
  typia.assertGuard(orderItem!);

  // 15. Validate historical snapshot fields preserve purchase-time data
  TestValidator.equals(
    "product name snapshot matches original sale title",
    orderItem.product_name,
    originalProductTitle,
  );

  TestValidator.equals(
    "SKU code snapshot matches original SKU code",
    orderItem.sku_code,
    originalSkuCode,
  );

  TestValidator.equals(
    "variant attributes snapshot matches original configuration",
    orderItem.variant_attributes,
    originalVariantCombination,
  );

  TestValidator.equals(
    "unit price snapshot matches original base price",
    orderItem.unit_price,
    originalBasePrice,
  );

  TestValidator.equals(
    "quantity matches ordered amount",
    orderItem.quantity,
    orderQuantity,
  );

  const expectedLineTotal = originalBasePrice * orderQuantity;
  TestValidator.equals(
    "line total calculated from snapshot pricing",
    orderItem.line_total,
    expectedLineTotal,
  );

  TestValidator.equals(
    "discount amount preserved from purchase time",
    orderItem.discount_amount,
    0,
  );

  // 16. Validate SKU reference maintains link to original product
  TestValidator.equals(
    "SKU reference ID matches original SKU",
    orderItem.sku.id,
    sku.id,
  );

  TestValidator.equals(
    "order item belongs to correct order",
    orderItem.shopping_mall_order_id,
    order.id,
  );
}
