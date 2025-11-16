import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate toggling of the activation flag on a platform-wide configuration
 * setting.
 *
 * This E2E test ensures that a platform administrator can safely flip the
 * `is_active` flag on a global configuration entry without unintentionally
 * modifying other configuration fields, and that audit timestamps behave as
 * expected.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join. The SDK will automatically attach the returned
 *    access token to the shared connection so all subsequent calls are executed
 *    in the platformAdmin security context.
 * 2. As this admin, create a platform setting via POST
 *    /communityPlatform/platformAdmin/platformSettings, using a deterministic
 *    key/value/description and an initial `is_active = false`. Capture the
 *    returned ICommunityPlatformPlatformSetting and keep its identity and
 *    content fields for comparison.
 * 3. Call PUT
 *    /communityPlatform/platformAdmin/platformSettings/{platformSettingId} with
 *    the created `id` and an ICommunityPlatformPlatformSetting.IUpdate body
 *    that only sets `is_active = true`, leaving `key`, `value`, and
 *    `description` undefined so the backend preserves their original values.
 * 4. Verify via typia.assert and TestValidator that:
 *
 *    - The `id` is unchanged.
 *    - `key`, `value`, and `description` are identical to the original creation
 *         response.
 *    - `is_active` is now true.
 *    - `created_at` is unchanged.
 *    - `updated_at` has changed relative to the original (simple string inequality
 *         is sufficient).
 * 5. Perform a second toggle back to false by calling the same update endpoint
 *    with `is_active = false` and make the analogous assertions, additionally
 *    ensuring that the second `updated_at` differs from both the original and
 *    first-update timestamps.
 *
 * This test focuses purely on happy-path update semantics and field
 * preservation; it does not attempt to validate HTTP status codes, type
 * validation errors, or authorization failures. All type-level validation is
 * delegated to typia.assert, and authentication token handling is left to the
 * SDK.
 */
export async function test_api_platform_setting_update_toggle_activation_flag(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial platform setting with is_active = false.
  const settingCreateBody = {
    key: `test.toggle.is_active.${RandomGenerator.alphaNumeric(8)}`,
    value: "initial-value",
    description: "E2E toggle test for is_active flag on platform settings.",
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const created: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(created);

  // Snapshot original fields for later comparison.
  const originalId = created.id;
  const originalKey = created.key;
  const originalValue = created.value;
  const originalDescription = created.description;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalIsActive = created.is_active;

  TestValidator.equals(
    "initial is_active should be false",
    originalIsActive,
    false,
  );

  // 3. First update: toggle is_active -> true, leave other fields undefined.
  const firstUpdateBody = {
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.IUpdate;

  const updatedOnce: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.update(
      connection,
      {
        platformSettingId: created.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedOnce);

  // 4. Assertions for first toggle.
  TestValidator.equals(
    "id should remain unchanged after first update",
    updatedOnce.id,
    originalId,
  );
  TestValidator.equals(
    "key should remain unchanged after first update",
    updatedOnce.key,
    originalKey,
  );
  TestValidator.equals(
    "value should remain unchanged after first update",
    updatedOnce.value,
    originalValue,
  );
  TestValidator.equals(
    "description should remain unchanged after first update",
    updatedOnce.description,
    originalDescription,
  );
  TestValidator.equals(
    "is_active should be true after first update",
    updatedOnce.is_active,
    true,
  );
  TestValidator.equals(
    "created_at should remain unchanged after first update",
    updatedOnce.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change on first update",
    updatedOnce.updated_at !== originalUpdatedAt,
  );

  const firstUpdatedAt = updatedOnce.updated_at;

  // 5. Second update: toggle is_active -> false.
  const secondUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.IUpdate;

  const updatedTwice: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.update(
      connection,
      {
        platformSettingId: created.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedTwice);

  // Assertions for second toggle.
  TestValidator.equals(
    "id should remain unchanged after second update",
    updatedTwice.id,
    originalId,
  );
  TestValidator.equals(
    "key should remain unchanged after second update",
    updatedTwice.key,
    originalKey,
  );
  TestValidator.equals(
    "value should remain unchanged after second update",
    updatedTwice.value,
    originalValue,
  );
  TestValidator.equals(
    "description should remain unchanged after second update",
    updatedTwice.description,
    originalDescription,
  );
  TestValidator.equals(
    "is_active should be false after second update",
    updatedTwice.is_active,
    false,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second update",
    updatedTwice.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change again on second update",
    updatedTwice.updated_at !== firstUpdatedAt,
  );
}
