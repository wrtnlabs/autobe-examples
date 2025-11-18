import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_guest_user_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user so that admin-only
  //    endpoints such as systemSettings and guestUsers are accessible.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create at least one system setting to simulate a configured
  //    production-like environment.
  const systemSettingBody = {
    key: `e2e_not_found_guest_detail_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    type: "boolean",
    description:
      "E2E: flag used to ensure system settings path is exercised before guest user lookup.",
    group: "e2e-tests",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // 3. Generate a random UUID that should not correspond to an existing
  //    guest user record.
  const nonExistentGuestUserId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call the guest user detail endpoint with the random UUID and
  //    assert that an error is thrown (e.g., not-found or equivalent).
  await TestValidator.error(
    "admin guest user detail with non-existent id must fail",
    async () => {
      await api.functional.todoApp.adminUser.guestUsers.at(connection, {
        guestUserId: nonExistentGuestUserId,
      });
    },
  );
}
