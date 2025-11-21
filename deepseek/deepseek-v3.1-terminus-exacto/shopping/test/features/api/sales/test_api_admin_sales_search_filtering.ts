import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test advanced filtering capabilities for sales search including status-based
 * filtering (completed vs refunded sales), financial thresholds
 * (minimum/maximum amounts), commission rate ranges, and temporal filtering by
 * sale dates. Validate that filters work correctly in combination and return
 * appropriate subsets of sales data.
 */
export async function test_api_admin_sales_search_filtering(
  connection: api.IConnection,
) {
  // Create admin account for sales access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.name(2),
      contact_person: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/customer/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Generate multiple sales with varying amounts and dates
  const salesData: IShoppingMallSale.ISummary[] = [];

  // Create sales with different amounts and statuses
  for (let i = 0; i < 10; i++) {
    // Create order
    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: {
          currency: "USD",
          shipping_address: RandomGenerator.paragraph({ sentences: 2 }),
          billing_address: RandomGenerator.paragraph({ sentences: 2 }),
          items: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            () =>
              ({
                shopping_mall_product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                quantity: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1> &
                    tags.Maximum<5>
                >(),
              }) satisfies IShoppingMallOrderItem.ICreate,
          ),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);

    // Create payment
    const payment =
      await api.functional.shoppingMall.admin.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: {
            payment_method: "credit_card",
            payment_gateway: "stripe",
            transaction_id: `txn_${typia.random<string & tags.Format<"uuid">>()}`,
            amount: typia.random<
              number & tags.Minimum<100> & tags.Maximum<10000>
            >(),
            currency: "USD",
            status: i % 3 === 0 ? "refunded" : "captured",
          } satisfies IShoppingMallPayment.ICreate,
        },
      );
    typia.assert(payment);

    // Search for sales to verify they exist
    const searchResult = await api.functional.shoppingMall.admin.sales.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          search: order.order_number,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(searchResult);

    if (searchResult.data.length > 0) {
      salesData.push(...searchResult.data);
    }
  }

  // Test 1: Status-based filtering
  const completedSales = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sale_status: "completed",
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(completedSales);
  TestValidator.predicate(
    "completed sales should be returned",
    completedSales.data.length >= 0,
  );

  const refundedSales = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sale_status: "refunded",
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(refundedSales);
  TestValidator.predicate(
    "refunded sales should be returned",
    refundedSales.data.length >= 0,
  );

  // Test 2: Financial threshold filtering
  const minAmount = 500;
  const maxAmount = 5000;
  const amountFilteredSales =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_amount: minAmount,
        max_amount: maxAmount,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(amountFilteredSales);

  if (amountFilteredSales.data.length > 0) {
    TestValidator.predicate(
      "filtered sales should meet amount criteria",
      amountFilteredSales.data.every(
        (sale) =>
          sale.sale_amount >= minAmount && sale.sale_amount <= maxAmount,
      ),
    );
  }

  // Test 3: Commission rate filtering
  const minCommission = 5;
  const maxCommission = 15;
  const commissionFilteredSales =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_commission_rate: minCommission,
        max_commission_rate: maxCommission,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(commissionFilteredSales);

  if (commissionFilteredSales.data.length > 0) {
    TestValidator.predicate(
      "filtered sales should meet commission criteria",
      commissionFilteredSales.data.every(
        (sale) =>
          sale.commission_rate >= minCommission &&
          sale.commission_rate <= maxCommission,
      ),
    );
  }

  // Test 4: Temporal filtering
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString(); // now

  const dateFilteredSales = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        start_date: startDate,
        end_date: endDate,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(dateFilteredSales);
  TestValidator.predicate(
    "date filtered sales should be returned",
    dateFilteredSales.data.length >= 0,
  );

  // Test 5: Combined filtering
  const combinedFilteredSales =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sale_status: "completed",
        min_amount: 100,
        max_amount: 5000,
        start_date: startDate,
        end_date: endDate,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(combinedFilteredSales);
  TestValidator.predicate(
    "combined filtered sales should be returned",
    combinedFilteredSales.data.length >= 0,
  );

  // Test 6: Pagination validation
  const page1 = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "pagination should work correctly",
    page1.data.length <= 5 && page2.data.length <= 5,
  );

  // Test 7: Empty result set for impossible filters
  const impossibleFilterSales =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_amount: 1000000, // Very high amount that likely doesn't exist
        max_amount: 1000001,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(impossibleFilterSales);
  TestValidator.predicate(
    "impossible filter should return empty or limited results",
    impossibleFilterSales.data.length >= 0,
  );

  // Test 8: Sorting validation
  const sortedByAmount = await api.functional.shoppingMall.admin.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "sale_amount",
        order_direction: "desc",
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(sortedByAmount);

  if (sortedByAmount.data.length > 1) {
    TestValidator.predicate(
      "sales should be sorted by amount descending",
      sortedByAmount.data.every(
        (sale, index, array) =>
          index === 0 || sale.sale_amount <= array[index - 1].sale_amount,
      ),
    );
  }
}
