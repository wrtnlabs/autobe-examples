import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_audit_pagination_performance_large_datasets(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update connection headers with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authorizedAdmin.token.access,
  };
  // Test pagination with small limit (10 items) - performance measurement
  const startTimeSmall = Date.now();
  const firstPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const smallLimitTime = Date.now() - startTimeSmall;
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "small limit response time acceptable",
    smallLimitTime < 5000,
  );
  // Test subsequent page if available
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.admin.analytics.audit.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformAuditLog.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
    TestValidator.equals(
      "second page total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page total pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
  // Test with larger limit (50 items) - performance measurement
  const startTimeLarge = Date.now();
  const largeLimitPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const largeLimitTime = Date.now() - startTimeLarge;
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit page current page",
    largeLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit page limit",
    largeLimitPage.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large limit page records non-negative",
    largeLimitPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "large limit page pages non-negative",
    largeLimitPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "large limit response time acceptable",
    largeLimitTime < 5000,
  );
  // Test with maximum limit (100 items) - performance measurement
  const startTimeMax = Date.now();
  const maxLimitPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const maxLimitTime = Date.now() - startTimeMax;
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page current page",
    maxLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page records non-negative",
    maxLimitPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit page pages non-negative",
    maxLimitPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "max limit response time acceptable",
    maxLimitTime < 5000,
  );
  // Test edge case: page beyond available results
  const beyondPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: firstPage.pagination.pages + 10,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    firstPage.pagination.pages + 10,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals(
    "beyond page total records",
    beyondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "beyond page total pages",
    beyondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  // Test pagination with filtering by actor_type - performance measurement
  const startTimeFiltered = Date.now();
  const filteredPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_type: "user",
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const filteredTime = Date.now() - startTimeFiltered;
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered page current page",
    filteredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page limit",
    filteredPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered page records non-negative",
    filteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered page pages non-negative",
    filteredPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered response time acceptable",
    filteredTime < 5000,
  );
  // Test pagination with date range filtering - performance measurement
  const startTimeDateRange = Date.now();
  const dateRangePage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const dateRangeTime = Date.now() - startTimeDateRange;
  typia.assert(dateRangePage);
  TestValidator.equals(
    "date range page current page",
    dateRangePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range page limit",
    dateRangePage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "date range page records non-negative",
    dateRangePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "date range page pages non-negative",
    dateRangePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "date range response time acceptable",
    dateRangeTime < 5000,
  );
  // Test complex query with multiple filters - performance measurement
  const startTimeComplex = Date.now();
  const complexPage =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
          actor_type: "admin",
          success: true,
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  const complexTime = Date.now() - startTimeComplex;
  typia.assert(complexPage);
  TestValidator.equals(
    "complex page current page",
    complexPage.pagination.current,
    1,
  );
  TestValidator.equals("complex page limit", complexPage.pagination.limit, 25);
  TestValidator.predicate(
    "complex page records non-negative",
    complexPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complex page pages non-negative",
    complexPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "complex query response time acceptable",
    complexTime < 5000,
  );
  // Validate consistent ordering across pages
  if (firstPage.data.length > 1 && firstPage.pagination.pages > 1) {
    const secondPageItems =
      await api.functional.communityPlatform.admin.analytics.audit.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformAuditLog.IRequest,
        },
      );
    typia.assert(secondPageItems);
    // Ensure chronological ordering (newest first)
    if (firstPage.data.length > 0 && secondPageItems.data.length > 0) {
      const firstPageLastItem = firstPage.data[firstPage.data.length - 1];
      const secondPageFirstItem = secondPageItems.data[0];
      TestValidator.predicate(
        "chronological ordering maintained",
        new Date(firstPageLastItem.created_at) >=
          new Date(secondPageFirstItem.created_at),
      );
    }
  }
  // Test concurrent access scenarios
  const concurrentRequests = ArrayUtil.repeat(5, () =>
    api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    ),
  );
  const concurrentStartTime = Date.now();
  const concurrentResults = await Promise.all(concurrentRequests);
  const concurrentTime = Date.now() - concurrentStartTime;
  concurrentResults.forEach((result, index) => {
    typia.assert(result);
    TestValidator.equals(
      `concurrent request ${index + 1} current page`,
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      `concurrent request ${index + 1} limit`,
      result.pagination.limit,
      10,
    );
  });
  TestValidator.predicate(
    "concurrent access response time acceptable",
    concurrentTime < 10000,
  );
}
