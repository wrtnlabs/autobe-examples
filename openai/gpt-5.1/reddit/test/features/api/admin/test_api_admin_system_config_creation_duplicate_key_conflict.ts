import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate duplicate system configuration creation conflict for (category,
 * config_key).
 *
 * Business context:
 *
 * - Platform administrators (adminUser) can create global system configuration
 *   entries that influence platform behavior (auth settings, rate limits,
 *   etc.).
 * - The `community_platform_system_configs` table enforces a unique constraint on
 *   the `(category, config_key)` pair among non-deleted rows.
 * - The API must reject attempts to create a second active configuration with the
 *   same `(category, config_key)` rather than silently overwriting.
 *
 * Workflow:
 *
 * 1. Register and authenticate an adminUser via POST /auth/adminUser/join. The SDK
 *    automatically attaches the returned access token to the connection.
 * 2. As that admin, create a new system configuration via POST
 *    /communityPlatform/adminUser/systemConfigs using a concrete `(category,
 *    config_key)` pair and `is_active = true`.
 * 3. Assert that the first creation succeeds and returns a fully populated
 *    `ICommunityPlatformSystemConfig` whose key business fields reflect the
 *    request.
 * 4. Attempt to create another configuration with the exact same `(category,
 *    config_key)` while keeping `is_active = true` but changing other fields
 *    (`value`, `description`).
 * 5. Assert that this second create call fails with a 4xx HTTP error (e.g.,
 *    400/409/422), proving that the uniqueness constraint is enforced at the
 *    API layer and that clients must use update endpoints instead of duplicate
 *    create calls.
 */
export async function test_api_admin_system_config_creation_duplicate_key_conflict(
  connection: api.IConnection,
) {
  // 1. AdminUser join to establish authenticated admin context
  const joinRequest = {
    username: `admin_${Date.now()}`,
    email: `admin_${Date.now()}@example.com`,
    password: "P@ssw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. First system config creation with a specific (category, config_key)
  const firstCreateBody = {
    category: "auth",
    config_key: "password_reset_window_minutes",
    value: "30",
    description: "Password reset token validity window in minutes",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const firstConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstConfig);

  // Basic sanity checks that response echoes essential fields
  TestValidator.equals(
    "first config category should match request",
    firstConfig.category,
    firstCreateBody.category,
  );
  TestValidator.equals(
    "first config key should match request",
    firstConfig.config_key,
    firstCreateBody.config_key,
  );
  TestValidator.equals(
    "first config value should match request",
    firstConfig.value,
    firstCreateBody.value,
  );
  TestValidator.equals(
    "first config is_active should match request",
    firstConfig.is_active,
    firstCreateBody.is_active,
  );

  // 3. Second system config creation attempt with same (category, config_key)
  const secondCreateBody = {
    category: "auth",
    config_key: "password_reset_window_minutes",
    value: "45", // different value
    description: "Updated password reset window in minutes",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  // 4. Expect an HttpError with a 4xx status (e.g., 400/409/422) due to uniqueness violation
  await TestValidator.httpError(
    "duplicate system config create should result in 4xx conflict",
    [400, 409, 422],
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
