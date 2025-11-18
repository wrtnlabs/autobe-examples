import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate creation of a disabled todoApp system setting and its lifecycle
 * fields.
 *
 * Business goal: Ensure that an administrative user can create a new global
 * configuration / feature flag entry in `todo_app_system_settings` with
 * `enabled=false`, and that the record is persisted as a normal row
 * (non-deleted) with correct metadata. The disabled state must be controlled
 * purely by the `enabled` flag, not by soft deletion via `deleted_at`.
 *
 * End-to-end workflow:
 *
 * 1. Register a new admin via POST /auth/adminUser/join using a realistic
 *    `ITodoAppAdminUser.IJoin` payload.
 *
 *    - Email is random and unique (Format<"email">).
 *    - Password respects Format<"password"> (any non-empty string is acceptable per
 *         typia tag).
 *    - Optionally include a `display_name`.
 *    - Provide plausible `status` (e.g., "active") and simple `ip`, `href`,
 *         `referrer` strings.
 *    - Assert the response using `typia.assert<ITodoAppAdminUser.IAuthorized>`.
 *    - Rely on the SDK to install the Authorization token onto the shared
 *         `connection`.
 * 2. Call POST /todoApp/adminUser/systemSettings via
 *    `api.functional.todoApp.adminUser.systemSettings.create` with an
 *    `ITodoAppSystemSetting.ICreate` body representing a disabled experimental
 *    feature flag:
 *
 *    - Key: a deterministic test key string like
 *         "experimental_feature_x_disabled_flag_test" to avoid collisions
 *         within this test process.
 *    - Value: "true" (string) to model a boolean flag value stored as string.
 *    - Type: "boolean" to indicate semantic meaning.
 *    - Description: non-null, descriptive text stating this is for E2E disabled-flag
 *         behavior testing.
 *    - Group: "experimental" to categorize the setting.
 *    - Enabled: false.
 * 3. Validate that the create call returns an `ITodoAppSystemSetting` whose
 *    business fields match the request and whose lifecycle fields reflect
 *    proper persistence semantics:
 *
 *    - Use `typia.assert<ITodoAppSystemSetting>(setting)` to guarantee structural
 *         correctness, including id and timestamp formats.
 *    - Use `TestValidator.equals` to assert that `setting.key`, `setting.value`,
 *         `setting.type`, `setting.description`, `setting.group` equal the
 *         request payload values.
 *    - Use `TestValidator.equals` to assert that `setting.enabled` is `false`.
 *    - Use `TestValidator.predicate` to assert that `setting.created_at` and
 *         `setting.updated_at` are non-empty strings; `typia.assert` already
 *         validates `date-time` format.
 *    - Use `TestValidator.predicate` or `TestValidator.equals` to assert that
 *         `setting.deleted_at === null` or `setting.deleted_at === undefined`,
 *         confirming that disabled entries are not soft-deleted.
 * 4. Do not modify `connection.headers` directly; depend entirely on the SDK to
 *    manage Authorization. No additional endpoints (such as list or get-by-key)
 *    are required; validation is done solely against the create response.
 */
export async function test_api_system_setting_create_disabled_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain an authorized admin context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/register",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // 2. Create a disabled experimental system setting.
  const requestBody = {
    key: "experimental_feature_x_disabled_flag_test",
    value: "true",
    type: "boolean",
    description: "Experimental feature X flag for E2E disabled-state test",
    group: "experimental",
    enabled: false,
  } satisfies ITodoAppSystemSetting.ICreate;

  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: requestBody,
    });
  typia.assert<ITodoAppSystemSetting>(setting);

  // 3. Business assertions on returned setting fields.
  TestValidator.equals(
    "system setting key should match request",
    setting.key,
    requestBody.key,
  );
  TestValidator.equals(
    "system setting value should match request",
    setting.value,
    requestBody.value,
  );
  TestValidator.equals(
    "system setting type should match request",
    setting.type,
    requestBody.type,
  );
  TestValidator.equals(
    "system setting description should match request",
    setting.description,
    requestBody.description,
  );
  TestValidator.equals(
    "system setting group should match request",
    setting.group,
    requestBody.group,
  );

  TestValidator.equals(
    "system setting enabled flag should be false for disabled entry",
    setting.enabled,
    false,
  );

  // Lifecycle fields: created_at / updated_at should be present and non-empty.
  TestValidator.predicate(
    "system setting created_at should be a non-empty date-time string",
    setting.created_at.length > 0,
  );
  TestValidator.predicate(
    "system setting updated_at should be a non-empty date-time string",
    setting.updated_at.length > 0,
  );

  // Soft-delete semantics: disabled entries are not soft-deleted.
  TestValidator.predicate(
    "system setting deleted_at must be null or undefined for a newly created disabled entry",
    setting.deleted_at === null || setting.deleted_at === undefined,
  );
}
