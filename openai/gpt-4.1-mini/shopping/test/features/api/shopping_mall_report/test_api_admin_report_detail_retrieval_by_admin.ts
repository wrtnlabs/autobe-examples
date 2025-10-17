import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";

/**
 * Test the retrieval of detailed information of a specific administrative
 * report by an admin user.
 *
 * Scenario steps:
 *
 * 1. Authenticate as admin user (join operation) with valid email, password_hash,
 *    status="active".
 * 2. Use the authenticated session to create an admin report with valid fields:
 *    report_name, report_type, optionally content_uri.
 * 3. Retrieve the admin report details by the unique report ID.
 * 4. Validate all properties of the returned report including id,
 *    generatedByAdminId, reportName, reportType, contentUri, createdAt,
 *    updatedAt, deletedAt.
 * 5. Perform typia.assert validations on all API responses.
 * 6. Attempt to retrieve the same report without admin authentication to validate
 *    access control.
 * 7. Use TestValidator to assert equality of report data where appropriate, ensure
 *    the required properties are present.
 */
export async function test_api_admin_report_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = typia.random<string>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create admin report.
  const reportName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 12,
  });
  const reportType = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 14,
  });
  const contentUri = `https://example.com/reports/${typia.random<string & tags.Format<"uuid">>()}.pdf`;

  const report: IShoppingMallReport =
    await api.functional.shoppingMall.admin.reports.create(connection, {
      body: {
        report_name: reportName,
        report_type: reportType,
        content_uri: contentUri,
        generated_by_admin_id: adminAuthorized.id,
      } satisfies IShoppingMallReport.ICreate,
    });
  typia.assert(report);

  TestValidator.notEquals("report id not empty", report.id, "");
  TestValidator.equals("report name equal", report.reportName, reportName);
  TestValidator.equals("report type equal", report.reportType, reportType);
  TestValidator.equals(
    "contentUri equal",
    report.contentUri ?? null,
    contentUri,
  );
  TestValidator.equals(
    "generatedByAdminId equal",
    report.generatedByAdminId ?? null,
    adminAuthorized.id,
  );

  // 3. Retrieve the report details by its ID.
  const reportAt: IShoppingMallReport =
    await api.functional.shoppingMall.admin.reports.at(connection, {
      id: report.id,
    });
  typia.assert(reportAt);

  TestValidator.equals("retrieved report id matches", reportAt.id, report.id);
  TestValidator.equals(
    "retrieved report name matches",
    reportAt.reportName,
    report.reportName,
  );
  TestValidator.equals(
    "retrieved report type matches",
    reportAt.reportType,
    report.reportType,
  );
  TestValidator.equals(
    "retrieved contentUri matches",
    reportAt.contentUri ?? null,
    contentUri,
  );
  TestValidator.equals(
    "retrieved generatedByAdminId matches",
    reportAt.generatedByAdminId ?? null,
    adminAuthorized.id,
  );

  // 4. Validate date-time strings and deletedAt presence
  TestValidator.predicate(
    "createdAt is valid ISO date-time string",
    typeof reportAt.createdAt === "string" &&
      !isNaN(Date.parse(reportAt.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time string",
    typeof reportAt.updatedAt === "string" &&
      !isNaN(Date.parse(reportAt.updatedAt)),
  );
  // deletedAt can be null or undefined explicitly
  if (reportAt.deletedAt !== null && reportAt.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is valid ISO date-time string",
      !isNaN(Date.parse(reportAt.deletedAt)),
    );
  }

  // 5. Test access control by trying to retrieve the report without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to report should fail",
    async () => {
      await api.functional.shoppingMall.admin.reports.at(
        unauthenticatedConnection,
        {
          id: report.id,
        },
      );
    },
  );
}
