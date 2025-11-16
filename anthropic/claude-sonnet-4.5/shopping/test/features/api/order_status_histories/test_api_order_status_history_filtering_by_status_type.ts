import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test order status history filtering by specific status type.
 *
 * This test validates that buyers can filter order status histories to retrieve
 * only transitions matching a specific status type. The test creates a complete
 * order workflow including buyer registration, product setup, order placement,
 * and then queries the status history endpoint with status filtering to verify
 * that the filtering capability works correctly.
 *
 * The test ensures buyers can narrow down the audit trail to focus on
 * particular order states without retrieving the complete history.
 *
 * Workflow:
 *
 * 1. Create buyer account for order ownership
 * 2. Create admin account for category management
 * 3. Create product category
 * 4. Create seller account for product listing
 * 5. Create product sale listing
 * 6. Add purchasable SKU variant
 * 7. Register buyer shipping address
 * 8. Register buyer payment method
 * 9. Add product to shopping cart
 * 10. Create order from cart items
 * 11. Query status history with status filter
 * 12. Validate filtering results and pagination
 */
export async function test_api_order_status_history_filtering_by_status_type(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "BuyerPass123!";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://mall.example.com/register",
      referrer: "https://mall.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.mall.example.com/register",
      referrer: "https://admin.mall.example.com/login",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.mall.example.com/register",
      referrer: "https://seller.mall.example.com/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Add purchasable SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "M" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Switch back to buyer and register shipping address
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://mall.example.com/login",
      referrer: "https://mall.example.com/home",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const address =
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

  // Step 8: Register payment method
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
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: 12,
        expiry_year: 2026,
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

  // Step 9: Add product to shopping cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Test order for status history filtering",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Query status history without filtering first
  const statusHistoryResult =
    await api.functional.shoppingMall.buyer.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistoryResult);

  // Step 12: Validate pagination structure
  TestValidator.predicate(
    "status history response has pagination",
    statusHistoryResult.pagination !== null &&
      statusHistoryResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "status history response has data array",
    Array.isArray(statusHistoryResult.data),
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    statusHistoryResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    statusHistoryResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    statusHistoryResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    statusHistoryResult.pagination.pages >= 0,
  );

  // Validate that status history records exist for the newly created order
  TestValidator.predicate(
    "status history data contains at least one record",
    statusHistoryResult.data.length > 0,
  );

  // Validate all status history records belong to the correct order
  for (const historyRecord of statusHistoryResult.data) {
    TestValidator.equals(
      "status history record belongs to correct order",
      historyRecord.shopping_mall_order_id,
      order.id,
    );
  }

  // Step 13: Test filtering by specific status type
  if (statusHistoryResult.data.length > 0) {
    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ] as const;

    // Use pending status for filtering test
    const statusToFilter = "pending" as const;

    const filteredResult =
      await api.functional.shoppingMall.buyer.orders.statusHistories.index(
        connection,
        {
          orderId: order.id,
          body: {
            page: 1,
            limit: 20,
            status: statusToFilter,
            sort_by: "created_at",
            order: "desc",
          } satisfies IShoppingMallOrderStatusHistory.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Validate that all returned records match the filter criteria (if any results)
    for (const record of filteredResult.data) {
      TestValidator.equals(
        "filtered status history record matches status filter",
        record.new_status,
        statusToFilter,
      );
    }

    // Validate empty result handling is correct
    TestValidator.predicate(
      "filtered result has valid pagination even if empty",
      filteredResult.pagination !== null &&
        filteredResult.pagination !== undefined,
    );
  }
}
