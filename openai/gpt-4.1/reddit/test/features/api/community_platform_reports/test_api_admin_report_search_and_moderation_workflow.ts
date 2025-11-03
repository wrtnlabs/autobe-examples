import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReports";

/**
 * Validate comprehensive admin report search and moderation workflow.
 *
 * 1. Register a new admin user (unique context).
 * 2. Authenticate as admin.
 * 3. Search for content reports with advanced filters (type, status, auto_hidden,
 *    date range, reporter ids).
 * 4. Paginate results, validate boundaries (page, limit, totals).
 * 5. Verify that only admins can access this endpoint (try with unauthenticated
 *    context and expect error).
 * 6. Confirm all returned report summaries match requested filters and output is
 *    suitable for dashboard moderation.
 * 7. Test error scenarios including out-of-range pagination.
 */
export async function test_api_admin_report_search_and_moderation_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: "https://admin.join/" + RandomGenerator.alphaNumeric(10),
        referrer: "https://ref.ref/" + RandomGenerator.alphaNumeric(8),
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare a variety of search filters
  const reportTypes = [
    "spam",
    "abuse",
    "off_topic",
    "harassment",
    "explicit_content",
    "other",
  ] as const;
  const statuses = [
    "open",
    "under_review",
    "auto_hidden",
    "resolved",
    "dismissed",
  ] as const;

  // 3. Advanced paginated search: try various combinations
  for (const report_type of reportTypes) {
    for (const status of statuses) {
      const body = {
        page: 1 satisfies number,
        limit: 10 satisfies number,
        report_type,
        status,
        created_from: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 10,
        ).toISOString(),
        created_to: new Date().toISOString(),
      } satisfies ICommunityPlatformReports.IRequest;
      const pageRes: IPageICommunityPlatformReports.ISummary =
        await api.functional.communityPlatform.admin.reports.index(connection, {
          body,
        });
      typia.assert(pageRes);
      TestValidator.equals(
        `filter: type(${report_type}), status(${status}) is returned`,
        pageRes.pagination.current satisfies number,
        1,
      );
      TestValidator.predicate(
        `each report_type and status matches advanced filter`,
        pageRes.data.every(
          (r) => r.report_type === report_type && r.status === status,
        ),
      );
    }
  }

  // 4. Pagination boundary check (test an out-of-range page)
  const bodyBoundary = {
    page: 9999 satisfies number,
    limit: 10 satisfies number,
  } satisfies ICommunityPlatformReports.IRequest;
  const boundaryPage: IPageICommunityPlatformReports.ISummary =
    await api.functional.communityPlatform.admin.reports.index(connection, {
      body: bodyBoundary,
    });
  typia.assert(boundaryPage);
  TestValidator.equals(
    "boundary page returns empty data",
    boundaryPage.data.length,
    0,
  );

  // 5. Auto-hidden filter
  for (const auto_hidden of [true, false]) {
    const bodyAutoHidden = {
      limit: 5 satisfies number,
      auto_hidden,
    } satisfies ICommunityPlatformReports.IRequest;
    const res = await api.functional.communityPlatform.admin.reports.index(
      connection,
      { body: bodyAutoHidden },
    );
    typia.assert(res);
    TestValidator.predicate(
      `auto_hidden filter applied (${auto_hidden})`,
      res.data.every((r) => r.auto_hidden === auto_hidden),
    );
  }

  // 6. Only admins can access: attempt with unauthenticated/empty context
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated context is rejected",
    async () => {
      await api.functional.communityPlatform.admin.reports.index(unauthConn, {
        body: { limit: 1 satisfies number },
      });
    },
  );
}
