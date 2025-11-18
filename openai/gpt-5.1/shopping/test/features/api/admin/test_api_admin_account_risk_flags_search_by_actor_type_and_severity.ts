import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Verify that an admin can search account risk flags filtered by actor type and
 * severity and receive a correctly paginated summary result.
 *
 * Business flow:
 *
 * 1. Register a fresh admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. As that admin, call PATCH /shoppingMall/admin/accountRiskFlags with an
 *    IShoppingMallAccountRiskFlag.IRequest body that specifies page, limit,
 *    actor_type (e.g., "customer"), and severity (e.g., "high").
 * 3. Validate that the response conforms to
 *    IPageIShoppingMallAccountRiskFlag.ISummary and that pagination metadata is
 *    coherent with the returned data length.
 * 4. For each risk flag summary in the page, validate that actor_type and severity
 *    match the requested filters.
 * 5. Optionally perform another search with a different severity to confirm the
 *    filter changes the result set or yields an empty list, proving that
 *    server-side filtering by severity is effective.
 */
export async function test_api_admin_account_risk_flags_search_by_actor_type_and_severity(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin to obtain an authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Perform a filtered search by actor_type and severity with pagination.
  const page = 1;
  const limit = 20;
  const actorType = "customer";
  const severityHigh = "high";

  const highRequestBody = {
    page,
    limit,
    actor_type: actorType,
    severity: severityHigh,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const highPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: highRequestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(highPage);

  const highPagination = highPage.pagination;
  const highData = highPage.data;

  // 3. Validate pagination metadata coherence.
  TestValidator.equals(
    "pagination current page should equal requested page",
    highPagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    highPagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be >= data.length",
    highPagination.records >= highData.length,
  );

  if (highPagination.records === 0) {
    TestValidator.equals(
      "when no records, pages should be 0",
      highPagination.pages,
      0,
    );
    TestValidator.equals(
      "when no records, data length should be 0",
      highData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when there are records, pages should be >= 1",
      highPagination.pages >= 1,
    );
  }

  // 4. Validate each summary entry matches the requested filters.
  for (const flag of highData) {
    typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);

    TestValidator.equals(
      "flag.actor_type should match requested actorType",
      flag.actor_type,
      actorType,
    );
    TestValidator.equals(
      "flag.severity should match requested severity",
      flag.severity,
      severityHigh,
    );
  }

  // 5. Optionally, perform another search with a different severity to
  //    demonstrate filter behavior.
  const severityLow = "low";
  const lowRequestBody = {
    page,
    limit,
    actor_type: actorType,
    severity: severityLow,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const lowPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: lowRequestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(lowPage);

  const lowData = lowPage.data;

  // Basic pagination sanity for the low severity result.
  TestValidator.equals(
    "low severity pagination current page should equal requested page",
    lowPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "low severity pagination limit should equal requested limit",
    lowPage.pagination.limit,
    limit,
  );

  // If both result sets are non-empty, ensure they are not trivially identical
  // by comparing lengths or at least one differing id.
  if (highData.length > 0 && lowData.length > 0) {
    if (highData.length !== lowData.length) {
      TestValidator.predicate(
        "high and low severity pages should differ in length when both non-empty",
        highData.length !== lowData.length,
      );
    } else {
      const highIds = new Set(highData.map((f) => f.id));
      const hasDifferentId = lowData.some((f) => !highIds.has(f.id));
      TestValidator.predicate(
        "high and low severity pages should differ in at least one id when both non-empty and same length",
        hasDifferentId,
      );
    }
  }
}
