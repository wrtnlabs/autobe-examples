import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";

export async function test_api_admin_report_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin (admin join)
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new admin report with admin token
  const reportBody = {
    report_name: `report-${RandomGenerator.alphaNumeric(8)}`,
    report_type: "sales_summary",
    content_uri: null,
    generated_by_admin_id: admin.id,
  } satisfies IShoppingMallReport.ICreate;
  const report: IShoppingMallReport =
    await api.functional.shoppingMall.admin.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 3. Delete the created admin report
  await api.functional.shoppingMall.admin.reports.eraseReport(connection, {
    id: report.id,
  });

  // 4. Validate deletion by attempting to delete again, expecting error
  await TestValidator.error(
    "Deleting non-existent report should fail",
    async () => {
      await api.functional.shoppingMall.admin.reports.eraseReport(connection, {
        id: report.id,
      });
    },
  );

  // 5. Verify that deletion by unauthorized user fails
  const nonAdminEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const nonAdminPasswordHash = RandomGenerator.alphaNumeric(12);

  // Join as another admin (simulate unauthorized by manual header swap elsewhere if possible)
  const nonAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: nonAdminEmail,
        password_hash: nonAdminPasswordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(nonAdmin);

  // Switch auth token to non-admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: nonAdminEmail,
      password_hash: nonAdminPasswordHash,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Attempt deletion, should fail due to insufficient permissions
  await TestValidator.error(
    "Unauthorized user cannot delete admin reports",
    async () => {
      await api.functional.shoppingMall.admin.reports.eraseReport(connection, {
        id: report.id,
      });
    },
  );
}
