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
import { prepare_random_shopping_mall_data_export } from "../../../prepare/prepare_random_shopping_mall_data_export";
import { generate_random_shopping_mall_admin_data_exports_create } from "../../../generate/generate_random_shopping_mall_admin_data_exports_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_data_export_admin_full_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user to initiate full data export
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
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
  typia.assert(adminUser);
  // Step 2: Initiate data export for customers - the only entity type supported in single call
  const exportJob: IShoppingMallDataExport =
    await api.functional.shoppingMall.admin.data.exports.create(
      adminConnection,
      {
        body: {
          entityType: "customers",
          format: "csv",
          emailNotification: true,
          ignorePermissionScoping: true,
        } satisfies IShoppingMallDataExport.ICreate,
      },
    );
  typia.assert(exportJob);
  // Step 3: Validate export job metadata
  TestValidator.equals(
    "export job status is pending",
    exportJob.status,
    "pending",
  );
  TestValidator.predicate(
    "export job has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      exportJob.id,
    ),
  );
  TestValidator.equals(
    "export job created_by matches admin ID",
    exportJob.created_by,
    adminUser.id,
  );
  TestValidator.equals("export job has no filters", exportJob.filters, null);
  TestValidator.equals(
    "export job has correct entity_types array",
    exportJob.entity_types,
    ["customers"],
  );
  TestValidator.equals(
    "export job export_type is bulk",
    exportJob.export_type,
    "bulk",
  );
  TestValidator.equals(
    "export job target_environment is production",
    exportJob.target_environment,
    "production",
  );
  // Step 4: Validate that file_url is initially generated after completion in simulation mode
  TestValidator.equals(
    "file_url is generated after completion",
    exportJob.file_url !== null,
    true,
  );
  TestValidator.predicate(
    "file_url is valid URI",
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(exportJob.file_url!),
  );
  TestValidator.predicate(
    "records_count is positive",
    exportJob.records_count! > 0,
  );
}
