import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_seller_subscription_plans_filter_by_code(
  connection: api.IConnection,
) {
  // 1. Load a canonical plan by code using the detail endpoint.
  // In real environment this would use a known seeded code; here we rely on
  // the simulator or test fixture configuration and a random string.
  const canonicalPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.sellerSubscriptionPlans.at(connection, {
      planCode: typia.random<string>(),
    });
  typia.assert(canonicalPlan);

  // 2. Prepare a request to filter by this exact plan code with simple
  // pagination parameters.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    code: canonicalPlan.code,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  // 3. Call the index endpoint with the filter request.
  const pageResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Basic pagination shape assertions.
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    limit,
  );

  // records must be non-negative (already guaranteed by type), but should be
  // at least the number of data items returned and at least 1 when data
  // exists.
  TestValidator.predicate(
    "records should be >= data length",
    pagination.records >= data.length,
  );

  if (data.length > 0) {
    TestValidator.predicate(
      "records should be >= 1 when data is non-empty",
      pagination.records >= 1,
    );
  }

  // pages must follow ceiling(records / limit).
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages should equal ceil(records / limit)",
    pagination.pages,
    expectedPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 5. Assert that data is non-empty and all codes match the filtered code.
  TestValidator.predicate(
    "data array should not be empty when filtering by existing code",
    data.length > 0,
  );

  for (const summary of data) {
    TestValidator.equals(
      "each summary code should match requested code",
      summary.code,
      canonicalPlan.code,
    );
  }

  // 6. If the specific canonical plan appears in the list, its core fields
  // should match.
  const matched = data.find((item) => item.id === canonicalPlan.id);
  if (matched !== undefined) {
    TestValidator.equals(
      "matched summary id should equal canonical plan id",
      matched.id,
      canonicalPlan.id,
    );
    TestValidator.equals(
      "matched summary code should equal canonical plan code",
      matched.code,
      canonicalPlan.code,
    );
    TestValidator.equals(
      "matched summary name should equal canonical plan name",
      matched.name,
      canonicalPlan.name,
    );
    TestValidator.equals(
      "matched summary billing_period should equal canonical plan billing_period",
      matched.billing_period,
      canonicalPlan.billing_period,
    );
    TestValidator.equals(
      "matched summary currency should equal canonical plan currency",
      matched.currency,
      canonicalPlan.currency,
    );
    TestValidator.equals(
      "matched summary price_amount should equal canonical plan price_amount",
      matched.price_amount,
      canonicalPlan.price_amount,
    );
    TestValidator.equals(
      "matched summary is_active should equal canonical plan is_active",
      matched.is_active,
      canonicalPlan.is_active,
    );
    TestValidator.equals(
      "matched summary effective_from should equal canonical plan effective_from",
      matched.effective_from,
      canonicalPlan.effective_from,
    );
    TestValidator.equals(
      "matched summary effective_until should equal canonical plan effective_until",
      matched.effective_until,
      canonicalPlan.effective_until ?? null,
    );
  }
}
