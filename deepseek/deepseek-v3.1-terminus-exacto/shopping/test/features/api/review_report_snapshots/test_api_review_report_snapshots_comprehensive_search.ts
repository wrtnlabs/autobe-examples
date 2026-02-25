import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_report_snapshots_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminSetupConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminSetupConnection, {});
  typia.assert(admin);
  // 2. Test date range filtering
  const dateRangeConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeSearch =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      dateRangeConnection,
      {
        body: {
          snapshot_created_at_start: oneWeekAgo,
          snapshot_created_at_end: now,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "date range search returns valid pagination",
    dateRangeSearch.pagination.current === 1,
  );
  // 3. Test pattern matching with search field
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const patternSearch =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      searchConnection,
      {
        body: {
          search: "inappropriate",
          page: 1,
          limit: 5,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(patternSearch);
  // 4. Test individual field pattern matching
  const fieldPatternConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const fieldPatternSearch =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      fieldPatternConnection,
      {
        body: {
          report_category: "spam",
          report_reason: "duplicate",
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(fieldPatternSearch);
  // 5. Test actor ID filtering (when available)
  const actorConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const actorSearch =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      actorConnection,
      {
        body: {
          actor_id: admin.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(actorSearch);
  // 6. Test combination of multiple filters
  const combinedConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const combinedSearch =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      combinedConnection,
      {
        body: {
          snapshot_created_at_start: oneWeekAgo,
          snapshot_created_at_end: now,
          report_category: "spam",
          report_reason: "duplicate",
          search: "content",
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 7. Test pagination with different page sizes
  const smallPageConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const smallPage =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      smallPageConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(smallPage);
  const largePageConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const largePage =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      largePageConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(largePage);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "small page has correct limit",
    smallPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "large page has correct limit",
    largePage.pagination.limit === 50,
  );
  TestValidator.predicate(
    "pagination records calculation",
    largePage.pagination.pages >= smallPage.pagination.pages,
  );
  // 9. Test multi-page pagination
  const page1Connection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const page1 =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      page1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  if (page1.pagination.pages > 1) {
    const page2Connection: api.IConnection = {
      host: connection.host,
      headers: adminSetupConnection.headers,
    };
    const page2 =
      await api.functional.ecommerce.administrator.review_report_snapshots.index(
        page2Connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IEcommerceReviewReportSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.notEquals(
      "page 1 and page 2 data should differ",
      page1.data,
      page2.data,
    );
  }
  // 10. Test empty filters (returns all with reasonable defaults)
  const emptyConnection: api.IConnection = {
    host: connection.host,
    headers: adminSetupConnection.headers,
  };
  const emptyFilters =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      emptyConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(emptyFilters);
  TestValidator.predicate(
    "empty filters return valid data",
    emptyFilters.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limits respected",
    emptyFilters.data.length <= emptyFilters.pagination.limit,
  );
}
