import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Verify that system settings detail retrieval is restricted to admin users.
 *
 * Business intent:
 *
 * - System settings in todoApp contain sensitive global configuration such as
 *   feature flags or limits.
 * - Only actors authenticated as adminUser should be able to read detailed
 *   configuration for a specific key.
 * - Unauthenticated callers must not be able to read any system setting detail.
 * - Member/guest users should not gain access to admin-only configuration
 *   surfaces.
 *
 * Test flow:
 *
 * 1. Admin registration and authentication
 *
 *    - Call POST /auth/adminUser/join with a valid ITodoAppAdminUser.IJoin body.
 *    - Rely on the SDK to set connection.headers.Authorization to the admin access
 *         token.
 *    - Assert that an ITodoAppAdminUser.IAuthorized object is returned
 *         (typia.assert).
 * 2. Create a concrete system setting under the admin context
 *
 *    - Call POST /todoApp/adminUser/systemSettings with a valid
 *         ITodoAppSystemSetting.ICreate body.
 *    - Use a deterministic key (e.g., "e2e_admin_only_setting_<random_suffix>") so
 *         it can be fetched later.
 *    - Assert that an ITodoAppSystemSetting is returned and that its key matches the
 *         requested key, using typia.assert + TestValidator.equals.
 * 3. Attempt unauthenticated access to the same setting
 *
 *    - Construct a secondary IConnection based on the original but with headers: {}
 *         to simulate a client with no Authorization header.
 *    - Call GET /todoApp/adminUser/systemSettings/{settingKey} via
 *         api.functional.todoApp.adminUser.systemSettings.at using the
 *         unauthenticated connection.
 *    - Wrap this call in TestValidator.error with a descriptive title.
 *    - Do not assert specific HTTP status codes or error bodies; only assert that an
 *         error occurs.
 * 4. Retrieve system setting detail as the authenticated admin
 *
 *    - Using the original, admin-authenticated connection, call systemSettings.at
 *         with the same key.
 *    - Assert that an ITodoAppSystemSetting is returned and matches the created
 *         record (id and key equality at minimum).
 * 5. (Optional) Join memberUser and verify they cannot access admin system
 *    settings
 *
 *    - Call POST /auth/memberUser/join with a valid ITodoAppMemberUserJoin.ICreate
 *         body; SDK will set Authorization to a member token.
 *    - Create a fresh unauthenticated connection (headers: {}) or reuse the
 *         member-authenticated connection depending on how the backend enforces
 *         actor-based guards.
 *    - For safety and to avoid touching or reasoning about headers beyond what SDK
 *         manages, simulate non-admin calls using a clone with empty headers.
 *    - Call systemSettings.at for the same settingKey using that non-admin
 *         connection and wrap in TestValidator.error.
 * 6. (Optional) Join guestUser and verify they cannot access admin system settings
 *
 *    - Call POST /auth/guestUser/join with a valid ITodoAppGuestUser.IJoinRequest
 *         body; SDK sets guest Authorization.
 *    - As with memberUser, create a cloned connection with empty headers to avoid
 *         directly manipulating Authorization.
 *    - Call systemSettings.at for the same settingKey and assert error via
 *         TestValidator.error.
 * 7. Business assertions
 *
 *    - All successful responses must pass typia.assert for structural/type
 *         correctness.
 *    - Use TestValidator.equals to ensure that the `key` in the created and fetched
 *         ITodoAppSystemSetting match.
 *    - Use TestValidator.predicate with clear titles if additional boolean business
 *         checks are helpful (e.g., `enabled` flag preserved).
 *
 * Constraints and caveats:
 *
 * - Never inspect or mutate connection.headers directly except for creating a
 *   brand-new connection object with headers: {} to simulate unauthenticated
 *   requests.
 * - Never check HTTP status codes or error messages; only validate that an error
 *   is thrown when unauthorized/non-admin access is attempted.
 * - Do not create any invalid DTO bodies or perform negative type tests; all
 *   payloads must satisfy their DTO types.
 */
export async function test_api_system_settings_detail_security_requires_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a concrete system setting under the admin context
  const settingKey = `e2e_admin_only_setting_${RandomGenerator.alphaNumeric(8)}`;
  const createSettingBody = {
    key: settingKey,
    value: "42",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "e2e-security",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createSettingBody,
    });
  typia.assert(createdSetting);
  TestValidator.equals(
    "created system setting key should match request",
    createdSetting.key,
    settingKey,
  );

  // 3. Attempt unauthenticated access to the same setting
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access system setting detail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(
        unauthenticatedConnection,
        {
          settingKey,
        },
      );
    },
  );

  // 4. Retrieve system setting detail as the authenticated admin
  const fetchedAsAdmin: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(fetchedAsAdmin);

  TestValidator.equals(
    "admin should see same system setting id",
    fetchedAsAdmin.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "admin should see same system setting key",
    fetchedAsAdmin.key,
    createdSetting.key,
  );

  // 5. Optional: join memberUser and verify they cannot access admin system settings
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUnauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "member-equivalent unauthenticated caller cannot access system setting detail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(
        memberUnauthConnection,
        { settingKey },
      );
    },
  );

  // 6. Optional: join guestUser and verify they cannot access admin system settings
  const guestJoinBody = {
    external_ref: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoAppGuestUser.IJoinRequest;

  const guestAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  const guestUnauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest-equivalent unauthenticated caller cannot access system setting detail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(
        guestUnauthConnection,
        { settingKey },
      );
    },
  );

  // 7. Additional business sanity checks
  TestValidator.predicate(
    "created system setting should be enabled",
    createdSetting.enabled === true,
  );
  TestValidator.equals(
    "fetched system setting enabled flag matches created setting",
    fetchedAsAdmin.enabled,
    createdSetting.enabled,
  );
}
