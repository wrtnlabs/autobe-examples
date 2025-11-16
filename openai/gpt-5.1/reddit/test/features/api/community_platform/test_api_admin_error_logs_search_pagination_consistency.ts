import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

/**
 * Validate stable and consistent pagination over admin error log search
 * results.
 *
 * Business context
 *
 * - An adminUser can query technical error logs stored in
 *   `community_platform_error_logs` through a powerful search endpoint.
 * - Logs are read-only and can only be listed via PATCH
 *   /communityPlatform/adminUser/errorLogs with
 *   ICommunityPlatformErrorLog.IRequest.
 * - The system is expected to support paginated and sorted listing semantics that
 *   are stable under repeated queries with identical filters.
 *
 * This test focuses on validating that:
 *
 * 1. Pagination metadata is internally consistent across pages 1 and 2 when using
 *    the same filter and sort options.
 * 2. Log entries do not overlap between page 1 and page 2 for the same query (ids
 *    are unique across pages for a given page/limit).
 * 3. Each page respects the requested sort order by occurred_at in descending
 *    order.
 * 4. Re-fetching page 1 with the same conditions returns an identical set of
 *    records and ordering, demonstrating stable pagination.
 *
 * Implementation notes
 *
 * - The test does not attempt to create log entries because there is no public
 *   API for that in the given SDK; it instead assumes that the environment is
 *   pre-seeded with error logs.
 * - When the dataset is too small (0 records or <= limit), the test downgrades
 *   its expectations and only validates what is logically possible (e.g.,
 *   single-page ordering and basic pagination metadata).
 * - Authentication and configuration setup are done via the provided adminUser
 *   join and systemConfigs create APIs.
 */
export async function test_api_admin_error_logs_search_pagination_consistency(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain authorized context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a system configuration entry to simulate configured environment.
  const systemConfigBody = {
    category: "logging",
    config_key: "error_log_retention_days",
    value: "30",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert(systemConfig);

  // Helper to build a common search request body with varying page.
  const buildSearchBody = (
    page: number & tags.Type<"int32">,
    limitValue: number & tags.Type<"int32">,
  ): ICommunityPlatformErrorLog.IRequest => {
    return {
      occurredFrom: null,
      occurredTo: null,
      service_name: null,
      environment: null,
      severity: null,
      error_code: null,
      exception_name: null,
      correlation_id: null,
      query: null,
      page,
      limit: limitValue,
      sortBy: "occurred_at",
      sortDirection: "desc",
    } satisfies ICommunityPlatformErrorLog.IRequest;
  };

  const limit = 5 as number & tags.Type<"int32">;

  // 3. First page fetch.
  const firstPageRequest: ICommunityPlatformErrorLog.IRequest = buildSearchBody(
    1 as number & tags.Type<"int32">,
    limit,
  );

  const page1: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  const data1 = page1.data;

  // Basic metadata checks for page 1.
  TestValidator.predicate(
    "page1 current equals requested page 1",
    pagination1.current === 1,
  );
  TestValidator.predicate(
    "page1 limit equals requested limit",
    pagination1.limit === limit,
  );
  TestValidator.predicate(
    "page1 records non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate("page1 pages non-negative", pagination1.pages >= 0);
  TestValidator.predicate(
    "page1 data length does not exceed limit",
    data1.length <= pagination1.limit,
  );

  // Helper to assert descending order of occurred_at within a page.
  const assertDescendingOccurredAt = (
    titlePrefix: string,
    items: ICommunityPlatformErrorLog.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const curr = items[i];
      TestValidator.predicate(
        `${titlePrefix} occurred_at[${i - 1}] >= occurred_at[${i}]`,
        prev.occurred_at >= curr.occurred_at,
      );
    }
  };

  // If there are no records, just assert that data is empty and stop.
  if (pagination1.records === 0) {
    TestValidator.predicate(
      "no records implies empty data array",
      data1.length === 0,
    );
    return;
  }

  // Verify ordering within first page.
  assertDescendingOccurredAt("page1", data1);

  // If all records fit in a single page, perform single-page assertions and stop.
  if (pagination1.records <= pagination1.limit) {
    TestValidator.predicate(
      "single-page scenario: data length equals records",
      data1.length === pagination1.records,
    );
    TestValidator.predicate(
      "single-page scenario: pages should be 1",
      pagination1.pages === 1,
    );
    return;
  }

  // Multi-page scenario: we expect at least 2 pages.
  TestValidator.predicate(
    "multi-page scenario: pages >= 2",
    pagination1.pages >= 2,
  );

  // 4. Second page fetch with identical filters but page=2.
  const secondPageRequest: ICommunityPlatformErrorLog.IRequest =
    buildSearchBody(2 as number & tags.Type<"int32">, limit);

  const page2: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: secondPageRequest },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  const data2 = page2.data;

  // Metadata consistency between page 1 and page 2.
  TestValidator.predicate(
    "page2 current equals requested page 2",
    pagination2.current === 2,
  );
  TestValidator.predicate(
    "page2 limit equals page1 limit",
    pagination2.limit === pagination1.limit,
  );
  TestValidator.predicate(
    "page2 records equals page1 records",
    pagination2.records === pagination1.records,
  );
  TestValidator.predicate(
    "page2 pages equals page1 pages",
    pagination2.pages === pagination1.pages,
  );

  // Occurred_at ordering on second page.
  assertDescendingOccurredAt("page2", data2);

  // Ensure no overlapping ids between page1 and page2 when page2 has data.
  if (data2.length > 0) {
    const ids1 = data1.map((e) => e.id);
    const ids2 = data2.map((e) => e.id);

    for (const id of ids1) {
      TestValidator.predicate(
        "no overlapping ids between page1 and page2",
        ids2.includes(id) === false,
      );
    }
  }

  // 5. Re-fetch page 1 to verify stability of results.
  const page1Again: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(page1Again);

  const pagination1Again: IPage.IPagination = page1Again.pagination;
  const data1Again = page1Again.data;

  TestValidator.predicate(
    "page1 again pagination equals original",
    pagination1Again.current === pagination1.current &&
      pagination1Again.limit === pagination1.limit &&
      pagination1Again.records === pagination1.records &&
      pagination1Again.pages === pagination1.pages,
  );

  TestValidator.predicate(
    "page1 again data length equals original",
    data1Again.length === data1.length,
  );

  for (let i = 0; i < data1.length; i++) {
    TestValidator.predicate(
      `page1 again id at index ${i} matches original`,
      data1Again[i].id === data1[i].id,
    );
  }
}
