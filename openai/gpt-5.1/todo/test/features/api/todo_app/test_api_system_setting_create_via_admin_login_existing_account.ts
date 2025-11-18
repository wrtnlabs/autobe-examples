import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate system setting creation via login of an existing admin account.
 *
 * ## Business goal
 *
 * Prove that an administrative user who was previously registered using the
 * join endpoint can later authenticate via the login endpoint and successfully
 * create a new todo_app_system_settings record using the
 * /todoApp/adminUser/systemSettings POST API. This ensures that configuration
 * management works correctly for existing admins authenticating through normal
 * login flows, not only immediately after initial registration.
 *
 * ## Scenario steps
 *
 * 1. Register a new admin user with POST /auth/adminUser/join
 *
 *    - Build an ITodoAppAdminUser.IJoin payload with:
 *
 *         - Email: random valid email
 *         - Password: random valid password-format string
 *         - Display_name: optional random name
 *         - Status: a reasonable active status string like "active"
 *         - Ip: some dummy IP string (e.g., "127.0.0.1")
 *         - Href: a valid URI string representing the registration page
 *         - Referrer: a valid URI string representing the previous page
 *    - Call api.functional.auth.adminUser.join(connection, { body })
 *    - Typia.assert the ITodoAppAdminUser.IAuthorized response
 *    - Do not rely on the returned token beyond join; its purpose is to establish
 *         the account and prove join works. The SDK will already have updated
 *         connection.headers.Authorization internally.
 * 2. Authenticate the same admin via POST /auth/adminUser/login
 *
 *    - Reuse the same email and password values used for join
 *    - Build ITodoAppAdminUser.ILogin body with:
 *
 *         - Email: the same email from step 1
 *         - Password: the same password from step 1
 *         - Ip: null (or another dummy IP) to exercise nullable login ip
 *         - Href: a different valid URI (e.g., login page URL)
 *         - Referrer: a different valid URI (e.g., dashboard entry URL)
 *    - Call api.functional.auth.adminUser.login(connection, { body })
 *    - Typia.assert the ITodoAppAdminUser.IAuthorized response
 *    - This call must be relied upon to set the Authorization header for the
 *         subsequent systemSettings.create call, proving that login-sourced
 *         tokens work for admin configuration APIs.
 * 3. Create a new system setting via POST /todoApp/adminUser/systemSettings
 *
 *    - Construct an ITodoAppSystemSetting.ICreate body with realistic configuration
 *         values, for example:
 *
 *         - Key: a unique string derived from a stable prefix and some
 *                   RandomGenerator.alphaNumeric content, to avoid conflicts
 *                   with other tests (e.g., "e2e_max_active_todos_per_user_" +
 *                   random suffix)
 *         - Value: a string that encodes a numeric limit like "1000" or a boolean flag
 *                   such as "true"
 *         - Type: a semantic type marker such as "int" or "boolean" matching the chosen
 *                   value encoding
 *         - Description: a short RandomGenerator.paragraph with a few words describing
 *                   the test setting
 *         - Group: a logical group label like "limits" or "features"
 *         - Enabled: true to ensure the setting is active immediately
 *    - Call api.functional.todoApp.adminUser.systemSettings.create(connection, {
 *         body })
 *    - Assert that the result is a valid ITodoAppSystemSetting via typia.assert.
 * 4. Validate returned system setting fields
 *
 *    - Using TestValidator.equals, assert core field consistency between the request
 *         body and the response:
 *
 *         - Key: response.key equals request.key
 *         - Value: response.value equals request.value
 *         - Type: response.type equals request.type
 *         - Enabled: response.enabled equals request.enabled
 *         - Description: response.description equals request.description (noting that
 *                   both may be null or defined depending on how we set it)
 *         - Group: response.group equals request.group
 *    - Do not assert on id format, created_at, updated_at, or deleted_at manually
 *         because typia.assert has already validated those; focus on business
 *         semantics and request/response consistency.
 * 5. Emphasize authentication path semantics
 *
 *    - The test flow must depend on the login-issued token, meaning the
 *         systemSettings.create call happens strictly after a successful login
 *         with the existing admin email/password pair.
 *    - The test must not directly modify connection.headers.Authorization; it must
 *         trust the SDK join/login implementations to set the header.
 *    - No negative or error-case testing is required here (such as duplicate key
 *         conflicts or unauthorized access). The scenario is a happy path
 *         validation confirming that logged-in admins can create system
 *         settings using their standard login flow.
 */
export async function test_api_system_setting_create_via_admin_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Register a new admin user via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://todoapp.example.com/admin/join",
    referrer: "https://todoapp.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const joined: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Authenticate the same admin via login to obtain a fresh token
  const loginBody = {
    email,
    password,
    ip: null,
    href: "https://todoapp.example.com/admin/login",
    referrer: "https://todoapp.example.com/admin",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Create a new system setting using the login-issued admin session
  const settingKeyPrefix = "e2e_max_active_todos_per_user_";
  const settingKeySuffix = RandomGenerator.alphaNumeric(8);
  const settingKey = `${settingKeyPrefix}${settingKeySuffix}`;

  const createBody = {
    key: settingKey,
    value: "1000",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 4. Validate that the created system setting matches the request payload
  TestValidator.equals(
    "system setting key should match request key",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "system setting value should match request value",
    created.value,
    createBody.value,
  );
  TestValidator.equals(
    "system setting type should match request type",
    created.type,
    createBody.type,
  );
  TestValidator.equals(
    "system setting enabled flag should match request enabled",
    created.enabled,
    createBody.enabled,
  );
  TestValidator.equals(
    "system setting description should match request description",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "system setting group should match request group",
    created.group,
    createBody.group,
  );
}
