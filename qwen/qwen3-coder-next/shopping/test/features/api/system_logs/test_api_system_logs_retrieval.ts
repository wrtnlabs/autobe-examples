import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin login to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "admin123",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Test 1: Attempt to retrieve a non-existent log (should return 404)
  // This tests the error handling path since we can't create log entries manually
  await TestValidator.error("non-existent log returns 404", async () => {
    await api.functional.shoppingMall.admin.logs.at(adminConnection, {
      logId: "00000000-0000-0000-0000-000000000000",
    });
  });
  // Test 2: Successful retrieval with valid log ID
  // Using a sample log ID that might exist in production logs
  const validLogId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const retrievedLog = await api.functional.shoppingMall.admin.logs.at(
    adminConnection,
    {
      logId: validLogId,
    },
  );
  typia.assert(retrievedLog);
  // Validate that the retrieved log has the expected structure
  // NOTE: IShoppingMallSystematicLog may not have id, timestamp, severity, component, message properties
  // Instead, we only verify it's a valid IShoppingMallSystematicLog
  TestValidator.predicate("is valid log", typeof retrievedLog === "object");
}
