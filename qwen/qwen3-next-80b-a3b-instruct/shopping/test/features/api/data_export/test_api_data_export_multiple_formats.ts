import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExport";
import type { IShoppingMallDataExportFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExportFilters";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_data_export_multiple_formats(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://admin.example.com/join-${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://admin.example.com/signup-${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Store export responses for validation
  const exportResponses: IShoppingMallDataExport[] = [];
  // Define and validate the formats we want to test
  const formats: ("csv" | "json" | "excel")[] = ["csv", "json", "excel"];
  // Perform three sequential export requests with different formats
  for (const format of formats) {
    const exportResponse: IShoppingMallDataExport =
      await api.functional.shoppingMall.admin.data.exports.index(
        adminConnection,
        {
          body: {
            dataType: "customers", // Using 'customers' as per schema example
            format: format,
          } satisfies IShoppingMallDataExport.IRequest,
        },
      );
    typia.assert(exportResponse);
    // Validate export response has correct structure
    // Format must match requested format
    TestValidator.equals(
      `export format should be ${format}`,
      exportResponse.format,
      format,
    );
    // Status must be 'pending' after initial request
    TestValidator.equals(
      `export status should be pending`,
      exportResponse.status,
      "pending",
    );
    // For pending exports, file_url should be null
    TestValidator.equals(
      `file_url should be null for pending export`,
      exportResponse.file_url,
      null,
    );
    // Export ID must be defined
    TestValidator.predicate(
      `export id should be defined`,
      exportResponse.id !== null && exportResponse.id !== undefined,
    );
    exportResponses.push(exportResponse);
  }
  // Verify all three exports have distinct export IDs
  const exportIds = exportResponses.map((r) => r.id);
  TestValidator.predicate(
    "all three export_ids should be distinct",
    exportIds[0] !== exportIds[1] &&
      exportIds[0] !== exportIds[2] &&
      exportIds[1] !== exportIds[2],
  );
}
