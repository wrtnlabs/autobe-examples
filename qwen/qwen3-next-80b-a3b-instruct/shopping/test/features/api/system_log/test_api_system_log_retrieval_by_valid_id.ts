import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_log_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Register new admin account
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate a valid UUID that does not exist in the system
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent log entry
  // This should trigger a 404 Not Found error as per requirements
  await TestValidator.httpError(
    "non-existent log ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.system_logs.at(adminConnection, {
        logId: nonExistentLogId,
      });
    },
  );
}
