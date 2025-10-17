import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_refund_requests_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account for product creation
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 99.99,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create a customer account
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 4: Create delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 5: Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick([
            "credit_card",
            "debit_card",
            "paypal",
          ] as const),
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 6: Place an order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: RandomGenerator.pick([
          "standard",
          "express",
          "overnight",
        ] as const),
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order should be created with at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = typia.assert(orderResponse.order_ids[0]!);

  // Step 7: Create multiple refund requests with different properties
  const refundReasons = [
    "defective_damaged",
    "wrong_item",
    "does_not_match_description",
    "changed_mind",
    "quality_not_expected",
  ] as const;

  const refundRequest1 =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: refundReasons[0],
          refund_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          refund_amount_requested: 50.0,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest1);

  const refundRequest2 =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: refundReasons[1],
          refund_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          refund_amount_requested: 75.5,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest2);

  const refundRequest3 =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: refundReasons[2],
          refund_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          refund_amount_requested: 99.99,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest3);

  // Step 8: Test search without filters - should return all customer's refund requests
  const allRefunds = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(allRefunds);

  TestValidator.predicate(
    "search without filters should return refund requests",
    allRefunds.data.length >= 3,
  );

  TestValidator.predicate(
    "all returned refunds should belong to the customer",
    allRefunds.data.every((r) => r.shopping_mall_customer_id === customer.id),
  );

  // Step 9: Test filtering by refund_status
  const statusFilteredRefunds =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 10,
        refund_status: ["pending_review"],
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(statusFilteredRefunds);

  TestValidator.predicate(
    "status filtered refunds should match criteria",
    statusFilteredRefunds.data.every(
      (r) => r.refund_status === "pending_review",
    ),
  );

  // Step 10: Test filtering by refund_reason
  const reasonFilteredRefunds =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 10,
        refund_reason: ["defective_damaged", "wrong_item"],
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(reasonFilteredRefunds);

  TestValidator.predicate(
    "reason filtered refunds should match criteria",
    reasonFilteredRefunds.data.every(
      (r) =>
        r.refund_reason === "defective_damaged" ||
        r.refund_reason === "wrong_item",
    ),
  );

  // Step 11: Test filtering by order_id
  const orderFilteredRefunds =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_id: orderId,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(orderFilteredRefunds);

  TestValidator.predicate(
    "order filtered refunds should match order_id",
    orderFilteredRefunds.data.every(
      (r) => r.shopping_mall_order_id === orderId,
    ),
  );

  // Step 12: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString();

  const dateFilteredRefunds =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 10,
        requested_at_from: yesterday,
        requested_at_to: tomorrow,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(dateFilteredRefunds);

  TestValidator.predicate(
    "date filtered refunds should be within date range",
    dateFilteredRefunds.data.length >= 3,
  );

  // Step 13: Test refund amount filtering
  const minAmount = 10;
  const maxAmount = 100;

  const amountFilteredRefunds =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 10,
        refund_amount_min: minAmount,
        refund_amount_max: maxAmount,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(amountFilteredRefunds);

  TestValidator.predicate(
    "amount filtered refunds should be within amount range",
    amountFilteredRefunds.data.every(
      (r) =>
        r.refund_amount_requested >= minAmount &&
        r.refund_amount_requested <= maxAmount,
    ),
  );

  // Step 14: Test pagination
  const page1 = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals(
    "pagination page should be 1",
    page1.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 2",
    page1.pagination.limit,
    2,
  );

  TestValidator.predicate(
    "pagination should return correct number of items",
    page1.data.length <= 2,
  );

  // Step 15: Test sorting by requested_at descending
  const sortedDesc = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "requested_at",
        sort_order: "desc",
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(sortedDesc);

  TestValidator.predicate(
    "sorted refunds should be in descending order by requested_at",
    sortedDesc.data.length >= 2
      ? new Date(sortedDesc.data[0].requested_at).getTime() >=
          new Date(sortedDesc.data[1].requested_at).getTime()
      : true,
  );

  // Step 16: Test sorting by requested_at ascending
  const sortedAsc = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "requested_at",
        sort_order: "asc",
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(sortedAsc);

  TestValidator.predicate(
    "sorted refunds should be in ascending order by requested_at",
    sortedAsc.data.length >= 2
      ? new Date(sortedAsc.data[0].requested_at).getTime() <=
          new Date(sortedAsc.data[1].requested_at).getTime()
      : true,
  );
}
