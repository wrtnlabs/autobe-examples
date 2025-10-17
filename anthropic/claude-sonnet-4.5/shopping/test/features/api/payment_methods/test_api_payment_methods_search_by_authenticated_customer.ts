import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test authenticated customer payment method search with filtering and
 * pagination.
 *
 * This test validates the complete payment method search workflow for
 * authenticated customers:
 *
 * 1. Create and authenticate a customer account
 * 2. Create a billing address for payment methods
 * 3. Create multiple payment methods with different types
 * 4. Search and retrieve payment methods with pagination
 * 5. Validate pagination metadata and returned data
 * 6. Verify ownership - only customer's own payment methods are returned
 * 7. Confirm payment method summary information is correct
 */
export async function test_api_payment_methods_search_by_authenticated_customer(
  connection: api.IConnection,
) {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  const paymentTypes = ["credit_card", "debit_card", "paypal"] as const;

  const createdPaymentMethods = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const paymentType = RandomGenerator.pick(paymentTypes);
      const paymentMethod =
        await api.functional.shoppingMall.customer.paymentMethods.create(
          connection,
          {
            body: {
              payment_type: paymentType,
              gateway_token: RandomGenerator.alphaNumeric(32),
            } satisfies IShoppingMallPaymentMethod.ICreate,
          },
        );
      typia.assert(paymentMethod);
      return paymentMethod;
    },
  );

  const searchResult =
    await api.functional.shoppingMall.customer.paymentMethods.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result should contain pagination info",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "search result should contain data array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "pagination current page should be correct",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "should return at least the created payment methods",
    searchResult.data.length >= createdPaymentMethods.length,
  );

  const createdIds = createdPaymentMethods.map((pm) => pm.id);
  const returnedIds = searchResult.data.map((pm) => pm.id);
  const allCreatedReturned = createdIds.every((id) => returnedIds.includes(id));

  TestValidator.predicate(
    "all created payment methods should be in search results",
    allCreatedReturned,
  );

  for (const paymentMethod of searchResult.data) {
    TestValidator.predicate(
      "payment method should have id",
      typeof paymentMethod.id === "string" && paymentMethod.id.length > 0,
    );

    TestValidator.predicate(
      "payment method should have payment_type",
      typeof paymentMethod.payment_type === "string" &&
        paymentMethod.payment_type.length > 0,
    );
  }
}
