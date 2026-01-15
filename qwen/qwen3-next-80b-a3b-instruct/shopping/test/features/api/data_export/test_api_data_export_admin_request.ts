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
export async function test_api_data_export_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Request data export with minimal parameters - customer data in CSV format
  const exportRequest: IShoppingMallDataExport.IRequest = {
    dataType: "customers",
    format: "csv",
  } satisfies IShoppingMallDataExport.IRequest;
  // Step 3: Make the export request using adminConnection (never use base connection)
  const exportResponse: IShoppingMallDataExport =
    await api.functional.shoppingMall.admin.data.exports.index(
      adminConnection,
      {
        body: exportRequest,
      },
    );
  typia.assert(exportResponse);
  // Step 4: Validate that the export was queued successfully with pending status
  TestValidator.equals(
    "export status should be pending",
    exportResponse.status,
    "pending",
  );
  // Step 5: Validate required request parameters are retained in response
  TestValidator.equals(
    "export dataType should match requested",
    exportResponse.entity_types?.[0],
    "customers",
  );
  TestValidator.equals(
    "export format should match requested",
    exportResponse.format,
    "csv",
  );
  TestValidator.equals(
    "export export_type should be individual",
    exportResponse.export_type,
    "individual",
  );
  // Step 6: Validate mandatory fields are populated
  TestValidator.predicate(
    "export should have a valid request_id",
    () => exportResponse.request_id !== undefined,
  );
  TestValidator.predicate(
    "export should have a valid created_by",
    () => exportResponse.created_by !== undefined,
  );
  TestValidator.predicate(
    "export should have valid requested_at timestamp",
    () => exportResponse.requested_at !== undefined,
  );
  // IMPORTANT: file_url is optional and only populated when export is completed.
  // In pending state, file_url must be undefined - attempting to validate it as present would violate the API contract.
  // The scenario's request to validate 'valid file_url' in pending state is logically impossible and has been removed.
}
