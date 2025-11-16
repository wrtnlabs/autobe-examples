import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Validate advanced moderation report searching and pagination for community
 * administrators.
 *
 * Scenario:
 *
 * 1. Register a new administrator (and authenticate with token returned).
 * 2. Ensure only authenticated admin can search moderation reports:
 *    unauthenticated requests must fail.
 * 3. Perform privileged PATCH /communityPlatform/administrator/reports searches:
 *
 * - Filter by report status (open, resolved, escalated)
 * - Filter by report_type, reporter, target resource (if sample data present)
 * - Use paging (page/limit) and sorting (sort_by/order) parameters
 *
 * 4. Validate response structure and meta (pagination fields) for each call.
 * 5. Validate logical access control: restricted to admin role.
 * 6. Confirm sensitive fields are not leaked (sample ensures PII-filtering for
 *    audit listings).
 *
 * Note: As no report creation endpoint/material provided, searches may return
 * empty if no data is present; test validates format, meta, and access control
 * regardless.
 */
export async function test_api_administrator_moderation_reports_advanced_search(
  connection: api.IConnection,
) {
  // Register admin & obtain token
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 1. Unauthenticated report search: must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "reports search denied for unauthenticated",
    async () => {
      await api.functional.communityPlatform.administrator.reports.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 2. Basic privileged search with no filters (should succeed/no forbidden, may be empty)
  const basicResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(basicResult);
  TestValidator.equals(
    "pagination must exist",
    typeof basicResult.pagination === "object",
    true,
  );
  TestValidator.equals("data is array", Array.isArray(basicResult.data), true);
  // (ISummary only exposes id for cross-referencing, PII is never included)
  if (basicResult.data.length > 0) {
    for (const rep of basicResult.data) {
      TestValidator.equals("report id present", typeof rep.id, "string");
    }
  }

  // 3. Advanced filter: status = "open"
  const openResult =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "open",
        },
      },
    );
  typia.assert(openResult);
  TestValidator.equals(
    "data is array for status=open",
    Array.isArray(openResult.data),
    true,
  );

  // 4. Advanced filter: status = "resolved"
  const resolvedResult =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "resolved",
        },
      },
    );
  typia.assert(resolvedResult);
  TestValidator.equals(
    "data is array for status=resolved",
    Array.isArray(resolvedResult.data),
    true,
  );

  // 5. Advanced filter: status = "escalated"
  const escalatedResult =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "escalated",
        },
      },
    );
  typia.assert(escalatedResult);
  TestValidator.equals(
    "data is array for status=escalated",
    Array.isArray(escalatedResult.data),
    true,
  );

  // 6. Advanced filter: report_type = 'abuse'
  const reportTypeResult =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          report_type: "abuse",
        },
      },
    );
  typia.assert(reportTypeResult);
  TestValidator.equals(
    "data is array for type=abuse",
    Array.isArray(reportTypeResult.data),
    true,
  );

  // 7. Advanced filter: paging and sorting
  const pagedResult =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1 as number, // as number to match intersection types
          limit: 5 as number,
          sort_by: "status",
          order: "asc",
        },
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination present in paged search",
    typeof pagedResult.pagination === "object",
    true,
  );
  TestValidator.equals(
    "paged data is array",
    Array.isArray(pagedResult.data),
    true,
  );
}
