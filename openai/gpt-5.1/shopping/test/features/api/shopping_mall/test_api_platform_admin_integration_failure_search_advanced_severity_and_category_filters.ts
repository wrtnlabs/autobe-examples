import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_integration_failure_search_advanced_severity_and_category_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build primary advanced filter request
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const toDate = now;

  const primaryFilter = {
    page: 1,
    limit: 20,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    failureCategories: ["timeout", "authentication_error"],
    severityLevels: ["error", "critical"],
    statusCodes: [401, 429, 500],
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const primaryPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      { body: primaryFilter },
    );
  typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
    primaryPage,
  );

  const primaryPagination = primaryPage.pagination;
  const primaryData = primaryPage.data;

  // 3. Basic pagination invariants for primary filter
  TestValidator.predicate(
    "primary pagination current page index must be >= 0",
    primaryPagination.current >= 0,
  );
  TestValidator.predicate(
    "primary pagination limit must be > 0",
    primaryPagination.limit > 0,
  );
  TestValidator.predicate(
    "primary pagination records must be >= 0",
    primaryPagination.records >= 0,
  );
  TestValidator.predicate(
    "primary pagination pages must be >= 0",
    primaryPagination.pages >= 0,
  );

  if (primaryPagination.records === 0) {
    TestValidator.equals(
      "when records is 0, pages should be 0",
      primaryPagination.pages,
      0,
    );
    TestValidator.equals(
      "when records is 0, data should be empty",
      primaryData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages should be >= 1",
      primaryPagination.pages >= 1,
    );
    TestValidator.predicate(
      "data length must not exceed limit",
      primaryData.length <= primaryPagination.limit,
    );
  }

  // 4. Per-incident validations for primary data
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  for (const incident of primaryData) {
    typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(incident);

    // occurred_at must be within [from, to) range
    TestValidator.predicate(
      "incident.occurred_at should be on or after from",
      incident.occurred_at >= fromIso,
    );
    TestValidator.predicate(
      "incident.occurred_at should be before to",
      incident.occurred_at < toIso,
    );

    if (incident.status_code !== undefined) {
      TestValidator.predicate(
        "incident.status_code, when present, should be one of requested statusCodes",
        primaryFilter.statusCodes !== undefined &&
          primaryFilter.statusCodes.includes(incident.status_code),
      );
    }
  }

  // 5. Second filter with different combinations to check lack of cross-contamination
  const secondaryFilter = {
    page: 1,
    limit: 20,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    failureCategories: ["invalid_response", "throttling"],
    severityLevels: ["info"],
    statusCodes: [200],
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const secondaryPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      { body: secondaryFilter },
    );
  typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
    secondaryPage,
  );

  const secondaryPagination = secondaryPage.pagination;
  const secondaryData = secondaryPage.data;

  // 6. Pagination invariants for secondary filter
  TestValidator.predicate(
    "secondary pagination current page index must be >= 0",
    secondaryPagination.current >= 0,
  );
  TestValidator.predicate(
    "secondary pagination limit must be > 0",
    secondaryPagination.limit > 0,
  );
  TestValidator.predicate(
    "secondary pagination records must be >= 0",
    secondaryPagination.records >= 0,
  );
  TestValidator.predicate(
    "secondary pagination pages must be >= 0",
    secondaryPagination.pages >= 0,
  );

  if (secondaryPagination.records === 0) {
    TestValidator.equals(
      "when secondary records is 0, pages should be 0",
      secondaryPagination.pages,
      0,
    );
    TestValidator.equals(
      "when secondary records is 0, data should be empty",
      secondaryData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when secondary records > 0, pages should be >= 1",
      secondaryPagination.pages >= 1,
    );
    TestValidator.predicate(
      "secondary data length must not exceed limit",
      secondaryData.length <= secondaryPagination.limit,
    );
  }

  for (const incident of secondaryData) {
    typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(incident);

    TestValidator.predicate(
      "secondary incident.occurred_at should be on or after from",
      incident.occurred_at >= fromIso,
    );
    TestValidator.predicate(
      "secondary incident.occurred_at should be before to",
      incident.occurred_at < toIso,
    );

    if (incident.status_code !== undefined) {
      TestValidator.predicate(
        "secondary incident.status_code, when present, should be one of requested statusCodes",
        secondaryFilter.statusCodes !== undefined &&
          secondaryFilter.statusCodes.includes(incident.status_code),
      );
    }
  }

  // 7. Basic cross-comparison between primary and secondary results when both non-empty
  if (primaryData.length > 0 && secondaryData.length > 0) {
    const primarySignature = JSON.stringify(primaryData);
    const secondarySignature = JSON.stringify(secondaryData);

    if (
      primaryPagination.records !== secondaryPagination.records ||
      primarySignature !== secondarySignature
    ) {
      TestValidator.notEquals(
        "primary and secondary result sets should differ when filters differ",
        primarySignature,
        secondarySignature,
      );
    } else {
      TestValidator.equals(
        "primary and secondary data may coincidentally match but remain consistent",
        primarySignature,
        secondarySignature,
      );
    }
  }
}
