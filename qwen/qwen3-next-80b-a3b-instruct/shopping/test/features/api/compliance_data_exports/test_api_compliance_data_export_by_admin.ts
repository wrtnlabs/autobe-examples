import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataExports";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExports";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_data_export_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via authorization function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create compliance export request with detailed parameters
  const complianceRequest: IShoppingMallDataExports.IRequest = {
    page: 1,
    limit: 10,
    region: "EU",
    exportFormat: "json",
    auditLevel: "detailed",
    includeMetadata: true,
    exportCategory: "GDPR",
    priority: "normal",
    exportType: "GDPR",
    statusFilter: "completed" // Added required statusFilter property
  } satisfies IShoppingMallDataExports.IRequest;
  // Step 3: Call the compliance data exports endpoint with admin connection
  const complianceExport: IPageIShoppingMallDataExports.ISummary =
    await api.functional.shoppingMall.admin.compliance.data_exports.index(
      adminConnection, // ✅ Use admin-specific connection, not base connection
      {
        body: complianceRequest,
      },
    );
  typia.assert(complianceExport);
  // Step 4: Validate response structure and content
  TestValidator.predicate(
    "pagination exists",
    complianceExport.pagination !== undefined,
  );
  TestValidator.equals("page 1", complianceExport.pagination.current, 1);
  TestValidator.equals("limit 10", complianceExport.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one record",
    complianceExport.data.length >= 0,
  );
  // Validate first record if exists
  if (complianceExport.data.length > 0) {
    const firstExport = complianceExport.data[0];
    TestValidator.equals("export type is GDPR", firstExport.exportType, "GDPR");
    TestValidator.equals(
      "export format is json",
      firstExport.exportFormat,
      "json",
    );
    TestValidator.predicate(
      "export status is valid",
      ["pending", "processing", "completed", "failed"].includes(
        firstExport.exportStatus,
      ),
    );
    TestValidator.equals(
      "requested by admin",
      firstExport.requestedBy,
      admin.id,
    );
    TestValidator.predicate(
      "description provided",
      firstExport.description.length > 0,
    );
    TestValidator.predicate(
      "records count is non-negative",
      firstExport.recordsCount >= 0,
    );
  }
  // Step 5: Verify that non-admin connection fails to access endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  // Test that unauthorized access fails
  await TestValidator.error(
    "non-admin cannot access compliance data exports",
    async () => {
      await api.functional.shoppingMall.admin.compliance.data_exports.index(
        guestConnection, // ✅ Use guest connection (no auth)
        {
          body: complianceRequest,
        },
      );
    },
  );
}