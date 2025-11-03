import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_get_unauthorized(
  connection: api.IConnection,
) {
  // Purpose: Ensure unauthenticated callers cannot retrieve admin-only system settings.
  // 1) Build a valid-looking UUID for the path parameter
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();

  // 2) Create an unauthenticated connection by providing empty headers as recommended
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Attempt to retrieve the system setting without authentication
  // Expectation: Server returns 401 Unauthorized or 403 Forbidden.
  await TestValidator.httpError(
    "unauthenticated GET /todoApp/admin/systemSettings/:id should be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.admin.systemSettings.at(unauthConn, {
        systemSettingId,
      });
    },
  );
}
