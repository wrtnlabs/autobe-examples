import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_search_by_country_currency(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorization context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Helper to assert basic pagination invariants
  const assertPagination = (
    pagination: IPage.IPagination,
    titlePrefix: string,
  ) => {
    typia.assert<IPage.IPagination>(pagination);
    TestValidator.predicate(
      `${titlePrefix} - current page non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - limit non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pages non-negative`,
      pagination.pages >= 0,
    );
    if (pagination.limit > 0 && pagination.pages > 0) {
      TestValidator.predicate(
        `${titlePrefix} - pages * limit covers records`,
        pagination.pages * pagination.limit >= pagination.records,
      );
    }
  };

  // We'll pick two different country/currency pairs. Since we don't control
  // fixture data, we use fixed but realistic values and then focus our
  // assertions on internal consistency when any records are returned.
  const pairA = {
    country: "US" as string & tags.MinLength<2> & tags.MaxLength<2>,
    currency: "USD" as string & tags.MinLength<3> & tags.MaxLength<3>,
  };
  const pairB = {
    country: "KR" as string & tags.MinLength<2> & tags.MaxLength<2>,
    currency: "KRW" as string & tags.MinLength<3> & tags.MaxLength<3>,
  };

  // 2. Search payment methods for pairA (US / USD)
  const requestA = {
    // page and limit optional; use deterministic small page for stability
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    allowedCountries: [pairA.country],
    allowedCurrencies: [pairA.currency],
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const pageA: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: requestA,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(pageA);
  assertPagination(pageA.pagination, "pairA pagination");

  // If there are any results, verify that each one is logically consistent
  // with the filter. Since allowed_countries/allowed_currencies are serialized
  // comma-separated strings or null, we interpret them accordingly.
  if (pageA.data.length > 0) {
    for (const method of pageA.data) {
      typia.assert<IShoppingMallPaymentMethod.ISummary>(method);

      const countriesRaw = method.allowed_countries ?? "";
      const currenciesRaw = method.allowed_currencies ?? "";

      const countries = countriesRaw
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const currencies = currenciesRaw
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      TestValidator.predicate(
        "pairA - method must have matching country when filters are used",
        countries.length === 0 || countries.includes(pairA.country),
      );
      TestValidator.predicate(
        "pairA - method must have matching currency when filters are used",
        currencies.length === 0 || currencies.includes(pairA.currency),
      );
    }
  }

  // 3. Search payment methods for pairB (KR / KRW)
  const requestB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    allowedCountries: [pairB.country],
    allowedCurrencies: [pairB.currency],
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const pageB: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: requestB,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(pageB);
  assertPagination(pageB.pagination, "pairB pagination");

  if (pageB.data.length > 0) {
    for (const method of pageB.data) {
      typia.assert<IShoppingMallPaymentMethod.ISummary>(method);

      const countriesRaw = method.allowed_countries ?? "";
      const currenciesRaw = method.allowed_currencies ?? "";

      const countries = countriesRaw
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const currencies = currenciesRaw
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      TestValidator.predicate(
        "pairB - method must have matching country when filters are used",
        countries.length === 0 || countries.includes(pairB.country),
      );
      TestValidator.predicate(
        "pairB - method must have matching currency when filters are used",
        currencies.length === 0 || currencies.includes(pairB.currency),
      );
    }
  }

  // 4. If both searches returned non-empty results, ensure that there is at
  // least some difference between the two result sets, either in size or in
  // membership.
  if (pageA.data.length > 0 && pageB.data.length > 0) {
    const idsA = new Set(pageA.data.map((m) => m.id));
    const idsB = new Set(pageB.data.map((m) => m.id));

    const allIds = new Set<string>();
    for (const id of idsA) allIds.add(id);
    for (const id of idsB) allIds.add(id);

    TestValidator.predicate(
      "pairA vs pairB - result sets should not be strictly identical when both non-empty",
      allIds.size !== idsA.size || allIds.size !== idsB.size,
    );
  }
}
