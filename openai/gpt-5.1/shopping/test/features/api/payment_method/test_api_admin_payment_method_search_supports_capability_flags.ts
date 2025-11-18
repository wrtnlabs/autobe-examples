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

export async function test_api_admin_payment_method_search_supports_capability_flags(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context (token is auto-applied)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Baseline search without capability flags (supportsRefunds / supportsInstallments omitted)
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const baselinePage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  // 3. Search with supportsRefunds=true (installments flag omitted)
  const refundsOnlyRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    supportsRefunds: true,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const refundsOnlyPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: refundsOnlyRequest,
    });
  typia.assert(refundsOnlyPage);

  // 4. Search with supportsInstallments=true (refunds flag omitted)
  const installmentsOnlyRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    supportsInstallments: true,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const installmentsOnlyPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: installmentsOnlyRequest,
    });
  typia.assert(installmentsOnlyPage);

  // 5. Search with both capability flags false
  const bothFalseRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    supportsRefunds: false,
    supportsInstallments: false,
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const bothFalsePage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: bothFalseRequest,
    });
  typia.assert(bothFalsePage);

  // 6. Validate pagination invariants between baseline and filtered queries
  // Baseline should not be smaller than filtered sets in total records
  TestValidator.predicate(
    "baseline records >= refunds-only records",
    baselinePage.pagination.records >= refundsOnlyPage.pagination.records,
  );

  TestValidator.predicate(
    "baseline records >= installments-only records",
    baselinePage.pagination.records >= installmentsOnlyPage.pagination.records,
  );

  TestValidator.predicate(
    "baseline records >= both-false records",
    baselinePage.pagination.records >= bothFalsePage.pagination.records,
  );

  // When pages are identical and limit is the same, data length should not exceed limit
  TestValidator.predicate(
    "baseline data length <= limit",
    baselinePage.data.length <= baselinePage.pagination.limit,
  );
  TestValidator.predicate(
    "refunds-only data length <= limit",
    refundsOnlyPage.data.length <= refundsOnlyPage.pagination.limit,
  );
  TestValidator.predicate(
    "installments-only data length <= limit",
    installmentsOnlyPage.data.length <= installmentsOnlyPage.pagination.limit,
  );
  TestValidator.predicate(
    "both-false data length <= limit",
    bothFalsePage.data.length <= bothFalsePage.pagination.limit,
  );

  // 7. Consistency of page/limit across all responses
  TestValidator.equals(
    "refunds-only page matches baseline",
    refundsOnlyPage.pagination.current,
    baselinePage.pagination.current,
  );
  TestValidator.equals(
    "installments-only page matches baseline",
    installmentsOnlyPage.pagination.current,
    baselinePage.pagination.current,
  );
  TestValidator.equals(
    "both-false page matches baseline",
    bothFalsePage.pagination.current,
    baselinePage.pagination.current,
  );

  TestValidator.equals(
    "refunds-only limit matches baseline",
    refundsOnlyPage.pagination.limit,
    baselinePage.pagination.limit,
  );
  TestValidator.equals(
    "installments-only limit matches baseline",
    installmentsOnlyPage.pagination.limit,
    baselinePage.pagination.limit,
  );
  TestValidator.equals(
    "both-false limit matches baseline",
    bothFalsePage.pagination.limit,
    baselinePage.pagination.limit,
  );
}
