import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that creating a todoApp system setting requires admin
 * authentication.
 *
 * Business purpose:
 *
 * - System settings control global behavior of the todoApp backend and must not
 *   be modifiable by anonymous or non-admin actors.
 * - The POST /todoApp/adminUser/systemSettings endpoint is protected by the
 *   `adminUser` authorization actor, which in practice means that only
 *   connections that went through /auth/adminUser/join (or another admin login
 *   flow) should succeed.
 *
 * What this test validates:
 *
 * 1. A request to create a system setting using a connection that has never
 *    performed admin join must fail with an HTTP error.
 * 2. A request using a fresh connection object with empty headers (thus no
 *    Authorization token) must also fail.
 * 3. After performing api.functional.auth.adminUser.join on the original
 *    connection, the same systemSettings.create call with the exact same
 *    payload must succeed and return a valid ITodoAppSystemSetting.
 * 4. The successful creation response is type-safe and structurally valid (checked
 *    via typia.assert), and its key/value/type match the request payload to
 *    prove that the intended setting was created.
 *
 * High-level steps:
 *
 * 1. Prepare a deterministic ITodoAppSystemSetting.ICreate payload, including a
 *    unique key, value, type, description, group, and enabled flag.
 * 2. Attempt to call systemSettings.create on the original connection before any
 *    admin join and assert that an HTTP error is thrown using
 *    TestValidator.httpError.
 * 3. Construct a second connection object unauthConn by shallow-cloning the
 *    original connection but overriding headers to {}. Attempt
 *    systemSettings.create on unauthConn and assert that an HTTP error is
 *    thrown as well.
 * 4. Call api.functional.auth.adminUser.join on the original connection with a
 *    valid ITodoAppAdminUser.IJoin payload; the SDK will set
 *    connection.headers.Authorization automatically using the returned token.
 * 5. Re-attempt systemSettings.create on the now-authenticated original connection
 *    using the same payload and assert that it succeeds, returning an
 *    ITodoAppSystemSetting. Validate the response with typia.assert and
 *    TestValidator.equals for key/value/type and enabled.
 */
export async function test_api_system_setting_create_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic system setting payload
  const settingKey = `max_active_todos_${RandomGenerator.alphaNumeric(8)}`;
  const settingPayload = {
    key: settingKey,
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos per user for rate limiting tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  // 2. Attempt creation without admin authentication on original connection
  await TestValidator.httpError(
    "system setting creation without admin auth should fail on original connection",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.create(connection, {
        body: settingPayload,
      });
    },
  );

  // 3. Attempt creation on a fresh unauthenticated connection with empty headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "system setting creation with empty headers should fail",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.create(unauthConn, {
        body: settingPayload,
      });
    },
  );

  // 4. Perform admin join to obtain and install an admin JWT on the original connection
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://todoapp.local/admin/join",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Re-attempt system setting creation on the now-authenticated original connection
  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingPayload,
    });
  typia.assert(created);

  // Validate key/value/type/enabled match the request payload
  TestValidator.equals(
    "created system setting key should match request payload",
    created.key,
    settingPayload.key,
  );
  TestValidator.equals(
    "created system setting value should match request payload",
    created.value,
    settingPayload.value,
  );
  TestValidator.equals(
    "created system setting type should match request payload",
    created.type,
    settingPayload.type,
  );
  TestValidator.equals(
    "created system setting enabled flag should match request payload",
    created.enabled,
    settingPayload.enabled,
  );
}
