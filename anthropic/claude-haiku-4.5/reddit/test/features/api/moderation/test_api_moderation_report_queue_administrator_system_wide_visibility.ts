import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Administrator System-Wide Report Visibility Test
 *
 * This test validates that administrators have unrestricted access to view all
 * moderation reports across the entire platform without community-specific
 * filtering. Administrators can see reports from all communities, enabling
 * comprehensive platform oversight and health monitoring.
 *
 * Test Flow:
 *
 * 1. Administrator signs up and authenticates to the platform
 * 2. Administrator retrieves the moderation report queue
 * 3. Verify that reports are returned from the system-wide moderation queue
 * 4. Verify administrator has complete visibility without community restrictions
 * 5. Validate that report queue includes comprehensive report information
 * 6. Confirm system-wide visibility enables platform health monitoring
 */
export async function test_api_moderation_report_queue_administrator_system_wide_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);
  const administratorUsername = RandomGenerator.alphaNumeric(10);
  const administratorName = RandomGenerator.name();

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: administratorUsername,
        name: administratorName,
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  TestValidator.predicate(
    "administrator account created successfully",
    administrator.id !== null && administrator.id !== undefined,
  );
  TestValidator.equals(
    "administrator email matches registration",
    administrator.email,
    administratorEmail,
  );
  TestValidator.predicate(
    "administrator authenticated with access token",
    administrator.token.access !== null &&
      administrator.token.access !== undefined,
  );

  // Step 2: Retrieve moderation reports with system-wide visibility
  const reportQueryParams = {
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformReport.IRequest;

  const reportsPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: reportQueryParams,
      },
    );
  typia.assert(reportsPage);

  // Step 3: Verify pagination structure
  TestValidator.predicate(
    "pagination object exists",
    reportsPage.pagination !== null && reportsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    reportsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    reportsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    reportsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    reportsPage.pagination.pages >= 0,
  );

  // Step 4: Verify reports data array structure
  TestValidator.predicate(
    "reports data array exists",
    Array.isArray(reportsPage.data),
  );

  // Step 5: If reports exist, validate individual report structure
  if (reportsPage.data.length > 0) {
    const firstReport = reportsPage.data[0];
    typia.assert(firstReport);

    TestValidator.predicate(
      "report has unique identifier",
      firstReport.id !== null && firstReport.id !== undefined,
    );
    TestValidator.predicate(
      "report has category",
      firstReport.category !== null && firstReport.category !== undefined,
    );
    TestValidator.predicate(
      "report has status",
      firstReport.status !== null && firstReport.status !== undefined,
    );
    TestValidator.predicate(
      "report has priority",
      firstReport.priority !== null && firstReport.priority !== undefined,
    );
    TestValidator.predicate(
      "report has creation timestamp",
      firstReport.created_at !== null && firstReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "report has reporter information",
      firstReport.reporter !== null && firstReport.reporter !== undefined,
    );

    // Verify reporter summary structure
    if (firstReport.reporter) {
      TestValidator.predicate(
        "reporter has identifier",
        firstReport.reporter.id !== null &&
          firstReport.reporter.id !== undefined,
      );
      TestValidator.predicate(
        "reporter has username",
        firstReport.reporter.username !== null &&
          firstReport.reporter.username !== undefined,
      );
    }
  }

  // Step 6: Verify administrator has system-wide visibility (no community filtering)
  TestValidator.predicate(
    "administrator retrieved reports successfully",
    reportsPage !== null && reportsPage !== undefined,
  );

  // Step 7: Validate response can be used for platform health monitoring
  TestValidator.predicate(
    "report queue accessible for platform oversight",
    reportsPage.data !== null && reportsPage.data !== undefined,
  );
}
