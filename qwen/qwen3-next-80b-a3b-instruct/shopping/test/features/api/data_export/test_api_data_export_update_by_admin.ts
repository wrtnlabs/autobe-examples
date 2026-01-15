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
export async function test_api_data_export_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the join endpoint
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
  // Step 2: Create a data export record to obtain an exportId
  const createdExport: IShoppingMallDataExport =
    await generate_random_shopping_mall_admin_data_exports_create(
      adminConnection,
      {
        body: {
          entityType: "orders",
          format: "csv",
          emailNotification: true,
          maxSize: 52428800,
          includeHeaders: true,
          includeTimestamps: true,
          consolidateRelatedEntities: false,
          exportAsZip: true,
          dataType: "full",
          ignorePermissionScoping: false,
          batchSize: 1000,
        } satisfies IShoppingMallDataExport.ICreate,
      },
    );
  typia.assert(createdExport);
  const exportId = createdExport.id;
  // Step 3: Update the data export with new configuration
  const updatedExport: IShoppingMallDataExport =
    await api.functional.shoppingMall.admin.data.exports.update(
      adminConnection,
      {
        exportId: exportId,
        body: {
          status: "processing",
          enabled: true,
          schedule: "0 0 2 * * ?", // Daily at 2:00 AM
          description: "Updated daily export of order data for compliance",
          export_type: "scheduled",
          target_environment: "production",
          security_policy: "redacted",
          error_message: "",
        } satisfies IShoppingMallDataExport.IUpdate,
      },
    );
  typia.assert(updatedExport);
  // Step 4: Validate the update results
  TestValidator.equals(
    "status updated to processing",
    updatedExport.status,
    "processing",
  );
  // Removed invalid property assertions: enabled, schedule, description
  // These properties are part of the update payload but not the response type
  TestValidator.equals(
    "export_type updated to scheduled",
    updatedExport.export_type,
    "scheduled",
  );
  TestValidator.equals(
    "target_environment updated to production",
    updatedExport.target_environment,
    "production",
  );
  TestValidator.equals(
    "security_policy updated to redacted",
    updatedExport.security_policy,
    "redacted",
  );
  TestValidator.equals(
    "error_message cleared",
    updatedExport.error_message,
    "",
  );
}