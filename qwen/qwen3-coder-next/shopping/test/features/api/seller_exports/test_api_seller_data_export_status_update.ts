import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerExports";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_data_export_status_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a seller export request with pending status
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const initialExport =
    await api.functional.shoppingMall.admin.sellers.exports.updateExportStatus(
      adminConnection,
      {
        sellerId,
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerExports.IRequest,
      },
    );
  typia.assert(initialExport);
  TestValidator.equals(
    "initial status is pending",
    initialExport.status,
    "pending",
  );
  // 3. Update export status to completed with file URL
  const fileUrl = `https://storage.example.com/exports/${typia.random<string & tags.Format<"uuid">>()}.json`;
  const completedExport =
    await api.functional.shoppingMall.admin.sellers.exports.updateExportStatus(
      adminConnection,
      {
        sellerId,
        body: {
          status: "completed",
          file_url: fileUrl,
        } satisfies IShoppingMallSellerExports.IRequest,
      },
    );
  typia.assert(completedExport);
  TestValidator.equals(
    "status updated to completed",
    completedExport.status,
    "completed",
  );
  TestValidator.equals(
    "fileUrl matches expected",
    completedExport.fileUrl,
    fileUrl,
  );
  typia.assertGuard(completedExport.completedAt!);
  // 4. Test failure scenario - update export status to failed
  const failureExport =
    await api.functional.shoppingMall.admin.sellers.exports.updateExportStatus(
      adminConnection,
      {
        sellerId,
        body: {
          status: "failed",
          error_message: "Storage service unavailable",
        } satisfies IShoppingMallSellerExports.IRequest,
      },
    );
  typia.assert(failureExport);
  TestValidator.equals(
    "status updated to failed",
    failureExport.status,
    "failed",
  );
  TestValidator.equals(
    "errorMessage matches",
    failureExport.errorMessage,
    "Storage service unavailable",
  );
  typia.assertGuard(failureExport.failedAt!);
  TestValidator.equals(
    "fileUrl is null on failure",
    failureExport.fileUrl,
    null,
  );
}