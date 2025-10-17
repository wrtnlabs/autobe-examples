import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";

/**
 * Administrative report creation workflow test.
 *
 * This test covers the flow of registering an admin user, creating an admin
 * record, and then creating a new report under that admin. Realistic data is
 * generated with proper formatting and unique identifiers. The test validates
 * authorization flows, data integrity, and response correctness.
 */
export async function test_api_admin_report_creation_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  // Generates a new IShoppingMallAdmin.ICreate request with realistic email and password hash
  // and calls api.functional.auth.admin.join to authenticate and obtain token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(32);
  const joinBody = {
    email: adminEmail,
    password_hash: passwordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authenticatedAdmin);

  // 2. Create admin account via admin admins create API
  const createAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: createAdminBody,
    });
  typia.assert(createdAdmin);
  TestValidator.equals(
    "created admin has email matching request",
    createdAdmin.email,
    createAdminBody.email,
  );

  // 3. Create a report associated with the created admin
  const uniqueReportName = `${RandomGenerator.name(3)}_${typia.random<string & tags.Format<"uuid">>()}`;
  const uniqueReportType = "sales_summary";

  const reportCreateBody = {
    report_name: uniqueReportName,
    report_type: uniqueReportType,
    generated_by_admin_id: createdAdmin.id,
  } satisfies IShoppingMallReport.ICreate;

  const createdReport: IShoppingMallReport =
    await api.functional.shoppingMall.admin.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 4. Validate created report properties
  TestValidator.predicate(
    "report id is a valid UUID",
    typeof createdReport.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        createdReport.id,
      ),
  );
  TestValidator.equals(
    "report name matches created report",
    createdReport.reportName,
    uniqueReportName,
  );
  TestValidator.equals(
    "report type matches created report",
    createdReport.reportType,
    uniqueReportType,
  );
  TestValidator.equals(
    "report generatedByAdminId matches created admin id",
    createdReport.generatedByAdminId,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "report createdAt is a valid ISO date-time string",
    typeof createdReport.createdAt === "string" &&
      !isNaN(Date.parse(createdReport.createdAt)),
  );
  TestValidator.predicate(
    "report updatedAt is a valid ISO date-time string",
    typeof createdReport.updatedAt === "string" &&
      !isNaN(Date.parse(createdReport.updatedAt)),
  );
  TestValidator.predicate(
    "report deletedAt is null or undefined",
    createdReport.deletedAt === null || createdReport.deletedAt === undefined,
  );
}
