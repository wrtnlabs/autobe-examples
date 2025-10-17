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

export async function test_api_refund_requests_search_multiple_status_filters(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Step 2: Create seller account
  const sellerData = {
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
    business_address: RandomGenerator.paragraph({ sentences: 5 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create products as seller
  const products = await ArrayUtil.asyncRepeat(5, async () => {
    const productData = {
      name: RandomGenerator.name(3),
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
      >(),
    } satisfies IShoppingMallProduct.ICreate;

    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: productData,
      },
    );
    typia.assert(product);
    return product;
  });

  // Step 4: Switch back to customer context and create address
  connection.headers = { Authorization: customer.token.access };

  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 5: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 6: Create multiple orders
  const orders = await ArrayUtil.asyncRepeat(6, async () => {
    const orderData = {
      delivery_address_id: address.id,
      payment_method_id: paymentMethod.id,
      shipping_method: "standard",
    } satisfies IShoppingMallOrder.ICreate;

    const orderResponse =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderData,
      });
    typia.assert(orderResponse);
    return orderResponse;
  });

  // Step 7: Create refund requests with varying amounts and reasons
  const refundAmounts = [50, 150, 250, 500, 750, 1000];
  const refundReasons = [
    "defective_damaged",
    "wrong_item",
    "does_not_match_description",
    "changed_mind",
    "quality_not_expected",
    "other",
  ] as const;

  const refundRequests = await ArrayUtil.asyncMap(
    orders,
    async (order, index) => {
      const orderId = order.order_ids[0];

      const refundData = {
        refund_reason: refundReasons[index % refundReasons.length],
        refund_description: RandomGenerator.paragraph({ sentences: 10 }),
        refund_amount_requested: refundAmounts[index],
      } satisfies IShoppingMallOrder.IRefundCreate;

      const refund =
        await api.functional.shoppingMall.customer.orders.refund.createRefund(
          connection,
          {
            orderId: orderId,
            body: refundData,
          },
        );
      typia.assert(refund);
      return refund;
    },
  );

  // Step 8: Test search with single status filter
  const pendingSearch = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        refund_status: ["pending_review"],
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(pendingSearch);

  TestValidator.predicate(
    "all results have pending_review status",
    pendingSearch.data.every((r) => r.refund_status === "pending_review"),
  );

  // Step 9: Test search with multiple status filters
  const multiStatusSearch =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        refund_status: ["pending_review", "approved", "rejected"],
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(multiStatusSearch);

  const allowedStatuses = ["pending_review", "approved", "rejected"] as const;
  TestValidator.predicate(
    "all results match allowed statuses",
    multiStatusSearch.data.every((r) =>
      allowedStatuses.includes(r.refund_status as any),
    ),
  );

  // Step 10: Test refund amount range filtering
  const amountRangeSearch =
    await api.functional.shoppingMall.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        refund_amount_min: 200,
        refund_amount_max: 800,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(amountRangeSearch);

  TestValidator.predicate(
    "all results within amount range",
    amountRangeSearch.data.every(
      (r) =>
        r.refund_amount_requested >= 200 && r.refund_amount_requested <= 800,
    ),
  );

  // Step 11: Test combined filters (status + amount range)
  const combinedSearch = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        refund_status: ["pending_review"],
        refund_amount_min: 100,
        refund_amount_max: 600,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(combinedSearch);

  TestValidator.predicate(
    "combined filter results match all criteria",
    combinedSearch.data.every(
      (r) =>
        r.refund_status === "pending_review" &&
        r.refund_amount_requested >= 100 &&
        r.refund_amount_requested <= 600,
    ),
  );

  // Step 12: Test sorting by refund_amount descending
  const sortedSearch = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_by: "refund_amount",
        sort_order: "desc",
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(sortedSearch);

  if (sortedSearch.data.length > 1) {
    TestValidator.predicate(
      "results sorted by refund_amount descending",
      sortedSearch.data.every((current, index) => {
        if (index === 0) return true;
        const previous = sortedSearch.data[index - 1];
        return (
          previous.refund_amount_requested >= current.refund_amount_requested
        );
      }),
    );
  }

  // Step 13: Validate pagination total count
  const paginationTest = await api.functional.shoppingMall.refundRequests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination total records matches expected",
    paginationTest.pagination.records >= refundRequests.length,
  );

  TestValidator.predicate(
    "pagination returns correct limit",
    paginationTest.data.length <= 3,
  );
}
