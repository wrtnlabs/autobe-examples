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

export async function test_api_admin_payment_method_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain an authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; send null explicitly to respect nullable union
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Initial unfiltered payment method search to discover existing data.
  const initialRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const initialPage =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: initialRequestBody,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(initialPage);

  const initialPagination = initialPage.pagination;
  const initialData = initialPage.data;

  // Basic pagination invariants for the initial call
  TestValidator.equals(
    "initial pagination.current should equal requested page",
    initialPagination.current,
    initialRequestBody.page,
  );
  TestValidator.equals(
    "initial pagination.limit should equal requested limit",
    initialPagination.limit,
    initialRequestBody.limit,
  );
  TestValidator.predicate(
    "initial records must be >= data.length",
    initialPagination.records >= initialData.length,
  );
  TestValidator.predicate(
    "initial pages must be >= 0",
    initialPagination.pages >= 0,
  );
  if (initialPagination.records === 0) {
    TestValidator.equals(
      "no records implies empty data",
      initialData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records exist, pages must be >= 1",
      initialPagination.pages >= 1,
    );
    TestValidator.predicate(
      "current page should not exceed total pages when records exist",
      initialPagination.current <= initialPagination.pages,
    );
  }

  // 3. If no payment methods exist, we cannot meaningfully test filters; exit after shape checks.
  if (initialData.length === 0) {
    return;
  }

  // 4. Derive concrete filter values from the initial dataset.
  const sample = initialData[0];
  const filterStatus = sample.status;
  const filterProviderType = sample.provider_type;

  // Collect codes matching the chosen status and provider_type
  const matchingCodes: string[] = initialData
    .filter(
      (m) =>
        m.status === filterStatus && m.provider_type === filterProviderType,
    )
    .map((m) => m.code);

  // Ensure we have at least one code in the filter set.
  TestValidator.predicate(
    "there should be at least one code matching chosen status and provider_type",
    matchingCodes.length > 0,
  );

  // Choose up to 3 unique codes for the filter.
  const uniqueCodes = Array.from(new Set(matchingCodes));
  const filteredCodes = uniqueCodes.slice(0, 3);

  const filterPage = 1;
  const filterLimit = 5;

  const filterRequestBody = {
    page: filterPage,
    limit: filterLimit,
    status: filterStatus,
    providerType: filterProviderType,
    codes: filteredCodes,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const filteredPage =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: filterRequestBody,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(filteredPage);

  const filteredPagination = filteredPage.pagination;
  const filteredData = filteredPage.data;

  // 5. Pagination assertions for the filtered call.
  TestValidator.equals(
    "filtered pagination.current should equal requested page",
    filteredPagination.current,
    filterPage,
  );
  TestValidator.equals(
    "filtered pagination.limit should equal requested limit",
    filteredPagination.limit,
    filterLimit,
  );
  TestValidator.predicate(
    "filtered records must be >= filtered data length",
    filteredPagination.records >= filteredData.length,
  );
  if (filteredPagination.records === 0) {
    TestValidator.equals(
      "no filtered records implies empty filtered data",
      filteredData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when filtered records exist, pages must be >= 1",
      filteredPagination.pages >= 1,
    );
    TestValidator.predicate(
      "current page should not exceed pages when filtered records exist",
      filteredPagination.current <= filteredPagination.pages,
    );
  }

  // 6. Business filter assertions: all returned items must match criteria.
  const allowedCodeSet = new Set(filteredCodes);
  for (const method of filteredData) {
    TestValidator.equals(
      "method.status must equal requested filterStatus",
      method.status,
      filterStatus,
    );
    TestValidator.equals(
      "method.provider_type must equal requested filterProviderType",
      method.provider_type,
      filterProviderType,
    );
    TestValidator.predicate(
      "method.code must be one of filteredCodes",
      allowedCodeSet.has(method.code),
    );
  }
}
