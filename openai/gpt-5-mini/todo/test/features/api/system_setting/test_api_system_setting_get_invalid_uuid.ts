import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_get_invalid_uuid(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure that malformed UUID path parameters are rejected by the
   * server's path-parameter validation logic with a client error.
   *
   * Steps:
   *
   * 1. Register/authenticate an admin via POST /auth/admin/join
   * 2. Call GET /todoApp/admin/systemSettings/{systemSettingId} with an invalid
   *    UUID string and assert that the call fails (400) using
   *    TestValidator.error
   */

  // 1) Admin registration & authentication
  const adminRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1",
    display_name: RandomGenerator.name(),
    href: "https://example.com/",
    referrer: "https://example.com/",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminRequestBody,
    },
  );
  typia.assert(admin);

  // 2) Call the target endpoint with an invalid UUID and expect a client error
  await TestValidator.error(
    "GET /todoApp/admin/systemSettings/:systemSettingId with malformed UUID should fail",
    async () => {
      await api.functional.todoApp.admin.systemSettings.at(connection, {
        systemSettingId: "invalid-uuid",
      });
    },
  );
}
