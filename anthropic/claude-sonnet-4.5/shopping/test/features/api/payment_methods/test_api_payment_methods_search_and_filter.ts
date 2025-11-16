import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the buyer's ability to search and retrieve their saved payment methods
 * with filtering and pagination.
 *
 * This test validates comprehensive payment method search functionality
 * including:
 *
 * - Filtering by payment type, card brand, verification status, and default
 *   status
 * - Date range filtering by creation date
 * - Pagination with various page sizes and page numbers
 * - Sorting by different fields in ascending and descending order
 * - Combined filter scenarios
 * - Accurate pagination metadata validation
 *
 * The test creates a buyer account and registers 15+ payment methods with
 * diverse attributes to thoroughly test all filtering and pagination
 * capabilities.
 */
export async function test_api_payment_methods_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create diverse payment methods for testing
  const paymentTypes = [
    "credit_card",
    "debit_card",
    "paypal",
    "apple_pay",
    "google_pay",
  ] as const;
  const cardBrands = ["visa", "mastercard", "amex"] as const;
  const providers = ["Stripe", "PayPal", "Square"] as const;

  const baseTime = new Date().getTime();
  const createdPaymentMethods: IShoppingMallPaymentMethod[] = [];

  // Create 15 payment methods with varied attributes
  for (let i = 0; i < 15; i++) {
    const paymentType = RandomGenerator.pick(paymentTypes);
    const isCard =
      paymentType === "credit_card" || paymentType === "debit_card";

    const paymentMethodData = {
      payment_type: paymentType,
      provider: RandomGenerator.pick(providers),
      provider_token: `tok_${typia.random<string & tags.Format<"uuid">>()}`,
      card_brand: isCard ? RandomGenerator.pick(cardBrands) : undefined,
      last_four_digits: isCard
        ? typia
            .random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<9999>
            >()
            .toString()
        : undefined,
      expiry_month: isCard
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >()
        : undefined,
      expiry_year: isCard
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<2024>>()
        : undefined,
      billing_name: RandomGenerator.name(),
      billing_postal_code: isCard
        ? typia
            .random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString()
        : undefined,
      is_default: i === 0,
    } satisfies IShoppingMallPaymentMethod.ICreate;

    const created =
      await api.functional.shoppingMall.buyer.paymentMethods.create(
        connection,
        {
          body: paymentMethodData,
        },
      );
    typia.assert(created);
    createdPaymentMethods.push(created);

    // Add small delay to ensure different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Step 3: Test filtering by payment_type
  const creditCardFilter =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        payment_type: "credit_card",
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(creditCardFilter);

  // Validate all returned items match the filter criteria
  for (const pm of creditCardFilter.data) {
    TestValidator.equals(
      "payment type is credit_card",
      pm.payment_type,
      "credit_card",
    );
  }

  // Step 4: Test filtering by card_brand
  const visaFilter =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        card_brand: "visa",
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(visaFilter);

  for (const pm of visaFilter.data) {
    TestValidator.equals("card brand is visa", pm.card_brand, "visa");
  }

  // Step 5: Test filtering by is_verified
  const verifiedFilter =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        is_verified: true,
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(verifiedFilter);

  for (const pm of verifiedFilter.data) {
    TestValidator.equals("payment method is verified", pm.is_verified, true);
  }

  // Step 6: Test filtering by is_default
  const defaultFilter =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(defaultFilter);

  TestValidator.predicate(
    "only one default payment method",
    defaultFilter.data.length <= 1,
  );
  if (defaultFilter.data.length === 1) {
    TestValidator.equals(
      "payment method is default",
      defaultFilter.data[0].is_default,
      true,
    );
  }

  // Step 7: Test pagination with different page sizes
  const page1Limit5 =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(page1Limit5);

  TestValidator.predicate(
    "page 1 has at most 5 items",
    page1Limit5.data.length <= 5,
  );
  TestValidator.equals("current page is 1", page1Limit5.pagination.current, 1);
  TestValidator.equals("limit is 5", page1Limit5.pagination.limit, 5);
  TestValidator.predicate(
    "total records matches",
    page1Limit5.pagination.records >= createdPaymentMethods.length,
  );

  const page2Limit5 =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(page2Limit5);

  TestValidator.equals("current page is 2", page2Limit5.pagination.current, 2);

  // Step 8: Test sorting by created_at ascending
  const sortedAsc =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(sortedAsc);

  for (let i = 1; i < sortedAsc.data.length; i++) {
    const prev = new Date(sortedAsc.data[i - 1].created_at).getTime();
    const curr = new Date(sortedAsc.data[i].created_at).getTime();
    TestValidator.predicate("ascending order maintained", prev <= curr);
  }

  // Step 9: Test sorting by created_at descending
  const sortedDesc =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(sortedDesc);

  for (let i = 1; i < sortedDesc.data.length; i++) {
    const prev = new Date(sortedDesc.data[i - 1].created_at).getTime();
    const curr = new Date(sortedDesc.data[i].created_at).getTime();
    TestValidator.predicate("descending order maintained", prev >= curr);
  }

  // Step 10: Test sorting by billing_name
  const sortedByName =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        sort_by: "billing_name",
        order: "asc",
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(sortedByName);

  for (let i = 1; i < sortedByName.data.length; i++) {
    TestValidator.predicate(
      "billing name alphabetical order",
      sortedByName.data[i - 1].billing_name <=
        sortedByName.data[i].billing_name,
    );
  }

  // Step 11: Test combined filters (payment_type + is_verified)
  const combinedFilter =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {
        payment_type: "credit_card",
        is_verified: true,
      } satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(combinedFilter);

  for (const pm of combinedFilter.data) {
    TestValidator.equals(
      "combined filter payment type",
      pm.payment_type,
      "credit_card",
    );
    TestValidator.equals(
      "combined filter verified status",
      pm.is_verified,
      true,
    );
  }

  // Step 12: Test date range filtering
  if (createdPaymentMethods.length > 0) {
    const firstCreated = createdPaymentMethods[0].created_at;
    const lastCreated =
      createdPaymentMethods[createdPaymentMethods.length - 1].created_at;

    const dateRangeFilter =
      await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
        body: {
          created_at_from: firstCreated,
          created_at_to: lastCreated,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      });
    typia.assert(dateRangeFilter);

    for (const pm of dateRangeFilter.data) {
      const pmDate = new Date(pm.created_at).getTime();
      const fromDate = new Date(firstCreated).getTime();
      const toDate = new Date(lastCreated).getTime();

      TestValidator.predicate(
        "payment method within date range",
        pmDate >= fromDate && pmDate <= toDate,
      );
    }
  }

  // Step 13: Test last_four_digits filtering
  const cardPaymentMethods = createdPaymentMethods.filter(
    (pm) => pm.last_four_digits,
  );
  if (cardPaymentMethods.length > 0) {
    const sampleCard = cardPaymentMethods[0];
    const lastFourDigits = sampleCard.last_four_digits;

    if (lastFourDigits !== null && lastFourDigits !== undefined) {
      const lastFourFilter =
        await api.functional.shoppingMall.buyer.paymentMethods.index(
          connection,
          {
            body: {
              last_four_digits: lastFourDigits,
            } satisfies IShoppingMallPaymentMethod.IRequest,
          },
        );
      typia.assert(lastFourFilter);

      for (const pm of lastFourFilter.data) {
        if (pm.last_four_digits) {
          TestValidator.predicate(
            "last four digits contains search term",
            pm.last_four_digits.includes(lastFourDigits),
          );
        }
      }
    }
  }

  // Step 14: Validate pagination metadata consistency
  const allPaymentMethods =
    await api.functional.shoppingMall.buyer.paymentMethods.index(connection, {
      body: {} satisfies IShoppingMallPaymentMethod.IRequest,
    });
  typia.assert(allPaymentMethods);

  const expectedPages = Math.ceil(
    allPaymentMethods.pagination.records / allPaymentMethods.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    allPaymentMethods.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "data length within limit",
    allPaymentMethods.data.length <= allPaymentMethods.pagination.limit,
  );
}
