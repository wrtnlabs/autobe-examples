import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an administrative user can retrieve their own detailed profile
 * via GET /todoApp/adminUser/adminUsers/{adminUserId} after joining and
 * performing minimal admin-only configuration.
 *
 * Business workflow:
 *
 * 1. Admin A joins the system via POST /auth/adminUser/join, receiving an
 *    ITodoAppAdminUser.IAuthorized response and establishing an authenticated
 *    admin session.
 * 2. Using the authenticated connection, Admin A creates a global system setting
 *    via POST /todoApp/adminUser/systemSettings to simulate basic admin-only
 *    operations.
 * 3. Admin A calls GET /todoApp/adminUser/adminUsers/{adminUserId} with their own
 *    id to retrieve their detailed admin profile.
 * 4. The test verifies that the detail response matches identity fields from the
 *    join response and that timestamps are consistent.
 */
export async function test_api_admin_user_detail_self_view(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // 2. Create a basic system setting using Admin A's token
  const systemSettingBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Self-view: fetch Admin A's own detailed profile
  const detail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: authorized.id,
    });
  typia.assert<ITodoAppAdminUser>(detail);

  // 4. Identity field consistency assertions
  TestValidator.equals(
    "self-view id matches join id",
    detail.id,
    authorized.id,
  );

  TestValidator.equals(
    "self-view email matches join email",
    detail.email,
    authorized.email,
  );

  TestValidator.equals(
    "self-view status matches join status",
    detail.status,
    authorized.status,
  );

  // display_name: handle nullable/undefinable nature explicitly
  if (
    (detail.display_name === null || detail.display_name === undefined) &&
    (authorized.display_name === null || authorized.display_name === undefined)
  ) {
    TestValidator.equals(
      "both display_name values are nullish",
      detail.display_name,
      authorized.display_name,
    );
  } else {
    TestValidator.equals(
      "self-view display_name matches join display_name",
      detail.display_name ?? null,
      authorized.display_name ?? null,
    );
  }

  // created_at and updated_at should match between join and detail
  TestValidator.equals(
    "self-view created_at matches join created_at",
    detail.created_at,
    authorized.created_at,
  );

  TestValidator.equals(
    "self-view updated_at matches join updated_at",
    detail.updated_at,
    authorized.updated_at,
  );
}
