import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_payment_methods_search_by_amount_thresholds(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three payment methods with different amount thresholds
  const codePrefix = `e2e_amount_${RandomGenerator.alphaNumeric(6)}`;

  const methodLowBody = {
    code: `${codePrefix}_low`,
    display_name: "Method Low",
    description: "Low range payment method",
    provider_key: "provider-low",
    method_type: "card",
    currency_restriction: null,
    min_amount: 0,
    max_amount: 100,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodMidBody = {
    code: `${codePrefix}_mid`,
    display_name: "Method Mid",
    description: "Middle range payment method",
    provider_key: "provider-mid",
    method_type: "card",
    currency_restriction: null,
    min_amount: 50,
    max_amount: 500,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodHighBody = {
    code: `${codePrefix}_high`,
    display_name: "Method High",
    description: "High range payment method",
    provider_key: "provider-high",
    method_type: "card",
    currency_restriction: null,
    min_amount: 400,
    max_amount: null,
    priority: 3 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodLow: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodLowBody },
    );
  typia.assert(methodLow);

  const methodMid: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodMidBody },
    );
  typia.assert(methodMid);

  const methodHigh: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodHighBody },
    );
  typia.assert(methodHigh);

  // 3. Unfiltered index call to ensure all three are discoverable
  const unfilteredPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as
            | (number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<200>)
            | undefined,
          code: codePrefix,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      },
    );
  typia.assert(unfilteredPage);

  const unfilteredIds = unfilteredPage.data.map((m) => m.id);

  TestValidator.predicate(
    "unfiltered list should contain low method",
    unfilteredIds.includes(methodLow.id),
  );
  TestValidator.predicate(
    "unfiltered list should contain mid method",
    unfilteredIds.includes(methodMid.id),
  );
  TestValidator.predicate(
    "unfiltered list should contain high method",
    unfilteredIds.includes(methodHigh.id),
  );

  // 4. Filtered index call by min_amount and max_amount thresholds
  const filterRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>)
      | undefined,
    code: codePrefix,
    min_amount_from: 60,
    min_amount_to: 450,
    max_amount_from: 80,
    max_amount_to: 600,
    sort_field: "priority",
    sort_direction: "asc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const filteredPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(filteredPage);

  const pagination = filteredPage.pagination;

  // 5. Pagination metadata validations
  TestValidator.equals(
    "pagination.records should equal data length",
    filteredPage.data.length,
    pagination.records,
  );

  TestValidator.equals(
    "current page index should be 0 when requesting page=1 (1-based request)",
    pagination.current,
    0,
  );

  TestValidator.predicate(
    "limit should be at least number of returned rows",
    pagination.limit >= filteredPage.data.length,
  );

  // 6. Business validation: only MethodMid should match
  const filteredIds = filteredPage.data.map((m) => m.id);

  TestValidator.predicate(
    "filtered list should contain mid method",
    filteredIds.includes(methodMid.id),
  );
  TestValidator.predicate(
    "filtered list should not contain low method",
    !filteredIds.includes(methodLow.id),
  );
  TestValidator.predicate(
    "filtered list should not contain high method",
    !filteredIds.includes(methodHigh.id),
  );

  // 7. Every result should satisfy the amount range constraints strictly
  for (const item of filteredPage.data) {
    const minAmount = item.min_amount;
    const maxAmount = item.max_amount;

    if (minAmount !== undefined) {
      TestValidator.predicate(
        "item.min_amount should be >= min_amount_from",
        minAmount >= filterRequest.min_amount_from!,
      );
      TestValidator.predicate(
        "item.min_amount should be <= min_amount_to",
        minAmount <= filterRequest.min_amount_to!,
      );
    }

    if (maxAmount !== undefined) {
      TestValidator.predicate(
        "item.max_amount should be >= max_amount_from",
        maxAmount >= filterRequest.max_amount_from!,
      );
      TestValidator.predicate(
        "item.max_amount should be <= max_amount_to",
        maxAmount <= filterRequest.max_amount_to!,
      );
    }
  }
}
