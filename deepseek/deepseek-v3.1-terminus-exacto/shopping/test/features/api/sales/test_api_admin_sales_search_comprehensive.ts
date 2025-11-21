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
 * Comprehensive E2E test for administrator sales search functionality
 *
 * This test validates the complete sales search workflow for administrators,
 * including multi-actor authentication, order creation, payment processing, and
 * comprehensive search filtering capabilities. The test ensures that
 * administrators can effectively search and filter sales data across all
 * sellers while maintaining proper security boundaries.
 */
export async function test_api_admin_sales_search_comprehensive(
  connection: api.IConnection,
) {
  // 1. Create administrator account for sales search access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          sales: ["read", "search"],
          orders: ["read"],
          customers: ["read"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create seller account to generate sales data
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 1 }),
        tax_id: undefined,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Create customer account to place orders
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        ip: undefined,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Create orders that will generate sales transactions
  const orders: IShoppingMallOrder[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const order: IShoppingMallOrder =
        await api.functional.shoppingMall.customer.orders.create(connection, {
          body: {
            currency: "USD",
            shipping_address: RandomGenerator.paragraph({ sentences: 1 }),
            billing_address: RandomGenerator.paragraph({ sentences: 1 }),
            items: ArrayUtil.repeat(
              2,
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
        });
      typia.assert(order);
      return order;
    },
  );

  // 5. Process payments to complete orders and generate sales
  const payments: IShoppingMallPayment[] = await ArrayUtil.asyncMap(
    orders,
    async (order) => {
      const payment: IShoppingMallPayment =
        await api.functional.shoppingMall.admin.orders.payments.create(
          connection,
          {
            orderId: order.id,
            body: {
              payment_method: "credit_card",
              payment_gateway: "stripe",
              transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
              amount: order.total_amount,
              currency: order.currency,
              status: "captured",
              authorization_code: `auth_${RandomGenerator.alphaNumeric(8)}`,
              payment_details: JSON.stringify({
                card_last4: "4242",
                card_brand: "visa",
              }),
            } satisfies IShoppingMallPayment.ICreate,
          },
        );
      typia.assert(payment);
      return payment;
    },
  );

  // Wait a moment for sales to be generated from payments
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 6. Test basic sales search with pagination
  const basicSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "",
        sale_status: undefined,
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: "sale_date",
        order_direction: "desc",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(basicSearchResult);
  TestValidator.predicate(
    "basic search returns pagination info",
    basicSearchResult.pagination !== undefined,
  );

  // 7. Test sales search with status filtering
  const statusSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "",
        sale_status: "completed",
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: "sale_amount",
        order_direction: "desc",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(statusSearchResult);

  // 8. Test sales search with amount range filtering
  const amountSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "",
        sale_status: undefined,
        min_amount: 0,
        max_amount: 10000,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: "net_amount",
        order_direction: "asc",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(amountSearchResult);

  // 9. Test sales search with date range filtering
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekLater = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const dateSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "",
        sale_status: undefined,
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: oneWeekAgo,
        end_date: oneWeekLater,
        order_by: "item_count",
        order_direction: "desc",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(dateSearchResult);

  // 10. Test sales search with commission rate filtering
  const commissionSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "",
        sale_status: undefined,
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: 0,
        max_commission_rate: 1,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: "commission_rate",
        order_direction: "asc",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(commissionSearchResult);

  // 11. Test sales search with text search
  const textSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "USD",
        sale_status: undefined,
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(textSearchResult);

  // 12. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    basicSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicSearchResult.pagination.pages >= 0,
  );

  // 13. Validate sales data structure in search results
  if (basicSearchResult.data.length > 0) {
    const sampleSale = basicSearchResult.data[0];
    TestValidator.predicate(
      "sale has valid ID",
      typeof sampleSale.id === "string" && sampleSale.id.length > 0,
    );
    TestValidator.predicate(
      "sale has positive amount",
      sampleSale.sale_amount > 0,
    );
    TestValidator.predicate(
      "sale has valid date",
      typeof sampleSale.sale_date === "string",
    );
    TestValidator.predicate("sale has item count", sampleSale.item_count >= 0);
    TestValidator.predicate(
      "sale has status",
      typeof sampleSale.sale_status === "string",
    );
    TestValidator.predicate(
      "sale has commission rate",
      sampleSale.commission_rate >= 0,
    );
    TestValidator.predicate("sale has net amount", sampleSale.net_amount >= 0);
    TestValidator.predicate(
      "sale has customer info",
      sampleSale.customer !== undefined,
    );
    TestValidator.predicate(
      "sale has seller info",
      sampleSale.seller !== undefined,
    );
    TestValidator.predicate(
      "sale has order info",
      sampleSale.order !== undefined,
    );
  }

  // 14. Test different pagination parameters
  const paginationTest: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.admin.sales.index(connection, {
      body: {
        page: 2,
        limit: 5,
        search: "",
        sale_status: undefined,
        min_amount: undefined,
        max_amount: undefined,
        min_commission_rate: undefined,
        max_commission_rate: undefined,
        min_net_amount: undefined,
        max_net_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination page matches request",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTest.pagination.limit,
    5,
  );

  // 15. Test empty search results gracefully
  TestValidator.predicate(
    "search API returns valid response structure",
    basicSearchResult.data !== undefined &&
      Array.isArray(basicSearchResult.data),
  );
}
