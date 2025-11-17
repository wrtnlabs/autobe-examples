import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

export async function test_api_shopping_mall_payment_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user signs up to acquire authentication token
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass1234",
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/login",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Define search inputs for payment searches
  const baseDate = new Date();
  const paymentMethods = ["credit_card", "paypal", "bank_transfer"] as const;
  const paymentStatuses = ["completed", "pending", "failed"] as const;

  const searchInputs: IShoppingMallPayment.IRequest[] = [
    // Simple pagination test
    {
      page: 1,
      limit: 10,
    },
    // Filter by payment method
    {
      page: 1,
      limit: 5,
      payment_method: RandomGenerator.pick(paymentMethods),
    },
    // Filter by payment status
    {
      page: 2,
      limit: 10,
      payment_status: RandomGenerator.pick(paymentStatuses),
    },
    // Filter by amount range
    {
      page: 1,
      limit: 10,
      payment_amount_min: 1000,
      payment_amount_max: 100000,
    },
    // Filter by payment date range
    {
      page: 1,
      limit: 20,
      payment_date_from: baseDate.toISOString(),
      payment_date_to: new Date(
        baseDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    // Combined filters
    {
      page: 1,
      limit: 10,
      payment_method: RandomGenerator.pick(paymentMethods),
      payment_status: RandomGenerator.pick(paymentStatuses),
      payment_amount_min: 500,
      payment_amount_max: 10000,
      payment_date_from: baseDate.toISOString(),
      payment_date_to: new Date(
        baseDate.getTime() + 3 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
  ];

  // 3. Iterate over each search request and perform validation
  for (const input of searchInputs) {
    const result: IPageIShoppingMallPayment.ISummary =
      await api.functional.shoppingMall.admin.payments.index(connection, {
        body: input,
      });
    typia.assert(result);

    // Validate pagination info
    const pagination = result.pagination;
    TestValidator.predicate(
      "pagination current page matches request",
      pagination.current === input.page,
    );
    TestValidator.predicate(
      "pagination limit matches request",
      pagination.limit === input.limit,
    );
    TestValidator.predicate(
      "pagination pages and records are non-negative",
      pagination.pages >= 0 && pagination.records >= 0,
    );

    // Validate each payment result
    for (const payment of result.data) {
      typia.assert(payment);
      // Check payment method filter
      if (input.payment_method !== undefined) {
        TestValidator.equals(
          `payment method matches filter: ${input.payment_method}`,
          payment.payment_method,
          input.payment_method,
        );
      }
      // Check payment status filter
      if (input.payment_status !== undefined) {
        TestValidator.equals(
          `payment status matches filter: ${input.payment_status}`,
          payment.status,
          input.payment_status,
        );
      }
      // Check payment amount filter
      if (input.payment_amount_min !== undefined) {
        TestValidator.predicate(
          `payment amount >= min: ${input.payment_amount_min}`,
          payment.amount >= input.payment_amount_min,
        );
      }
      if (input.payment_amount_max !== undefined) {
        TestValidator.predicate(
          `payment amount <= max: ${input.payment_amount_max}`,
          payment.amount <= input.payment_amount_max,
        );
      }
      // Check payment date range filter
      if (input.payment_date_from !== undefined) {
        if (payment.paid_at !== undefined) {
          TestValidator.predicate(
            `payment paid_at >= ${input.payment_date_from}`,
            payment.paid_at >= input.payment_date_from,
          );
        }
      }
      if (input.payment_date_to !== undefined) {
        if (payment.paid_at !== undefined) {
          TestValidator.predicate(
            `payment paid_at <= ${input.payment_date_to}`,
            payment.paid_at <= input.payment_date_to,
          );
        }
      }
    }
  }
}
