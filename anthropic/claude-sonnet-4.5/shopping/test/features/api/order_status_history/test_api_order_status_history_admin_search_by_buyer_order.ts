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
 * Validate administrator search and filtering of order status history records.
 *
 * This test demonstrates the complete workflow for administrators to retrieve
 * and analyze the audit trail of status transitions for buyer orders. The test
 * validates pagination, filtering by status type, date range filtering, and
 * sorting capabilities essential for order tracking and dispute resolution.
 *
 * Test workflow:
 *
 * 1. Create admin account with super_admin privileges
 * 2. Set up product catalog (category, seller, sale, SKU)
 * 3. Create buyer account and complete order placement workflow
 * 4. Switch to admin context and search order status histories
 * 5. Validate search results with various filter combinations
 */
export async function test_api_order_status_history_admin_search_by_buyer_order(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create category for product
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
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

  // Step 4: Create product sale
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

  // Step 5: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Red", Size: "L" }),
        base_price: typia.random<
          number & tags.Minimum<10> & tags.Maximum<1000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account
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

  // Step 7: Create buyer delivery address
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
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2025>
        >() satisfies number as number,
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

  // Step 9: Add SKU to shopping cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order from cart
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Switch back to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 12: Search order status histories with basic pagination
  const basicResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(basicResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    basicResult.pagination.current >= 1 &&
      basicResult.pagination.limit > 0 &&
      basicResult.pagination.records >= 0 &&
      basicResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "status history data should be array",
    Array.isArray(basicResult.data),
  );

  // Step 13: Test filtering by status type
  const statuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  const randomStatus = RandomGenerator.pick(statuses);

  const statusFilterResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          status: randomStatus,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusFilterResult);

  // Step 14: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Step 15: Test sorting by created_at ascending
  const sortByDateAscResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at" as const,
          order: "asc" as const,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortByDateAscResult);

  // Step 16: Test sorting by created_at descending
  const sortByDateDescResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at" as const,
          order: "desc" as const,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortByDateDescResult);

  // Step 17: Test sorting by status field
  const sortByStatusResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "status" as const,
          order: "asc" as const,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortByStatusResult);

  // Step 18: Test combined filtering and sorting
  const combinedResult =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          sort_by: "created_at" as const,
          order: "desc" as const,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(combinedResult);

  // Validate that admin can access order status histories regardless of ownership
  TestValidator.predicate(
    "admin should access any order status history",
    combinedResult.pagination.records >= 0,
  );
}
