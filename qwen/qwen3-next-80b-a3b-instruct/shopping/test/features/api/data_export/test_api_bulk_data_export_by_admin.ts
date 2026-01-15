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
export async function test_api_bulk_data_export_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin user via join endpoint using utility function
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
  // Configure export request with required dataType and format parameters
  // Ensure format is explicitly typed as the literal type 'csv'
  const exportRequest = {
    dataType: "customers",
    format: "csv" as "csv",
  } satisfies IShoppingMallDataExport.IRequest;
  // Initiate bulk data export using the same authenticated connection
  const exportRecord: IShoppingMallDataExport =
    await api.functional.shoppingMall.admin.data.exports.bulk.create(
      adminConnection,
      { body: exportRequest },
    );
  // Validate the export record response
  typia.assert(exportRecord);
  // Verify required business logic fields are correct
  TestValidator.equals(
    "export status should be pending",
    exportRecord.status,
    "pending",
  );
  TestValidator.equals(
    "export type should be bulk",
    exportRecord.export_type,
    "bulk",
  );
  TestValidator.equals(
    "created_by should match admin id",
    exportRecord.created_by,
    admin.id,
  );
  TestValidator.equals(
    "data type in request matches response",
    exportRecord.entity_types?.[0],
    exportRequest.dataType,
  );
  // Type assert and compare format value
  typia.assertGuard(exportRecord.format!);
  TestValidator.equals(
    "format in request matches response",
    exportRecord.format,
    exportRequest.format,
  );
}
