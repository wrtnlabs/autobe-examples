import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate creation of an inactive system configuration entry by an adminUser.
 *
 * Business goals:
 *
 * - Ensure an adminUser can create a system configuration row with `is_active =
 *   false` at creation time.
 * - Confirm that the backend does not force such a configuration to become
 *   active.
 * - Verify that key identity and lifecycle fields (id, timestamps) are populated
 *   and that core fields mirror the request payload.
 *
 * Test workflow:
 *
 * 1. Register a fresh adminUser via POST /auth/adminUser/join using random but
 *    valid credentials. The SDK will automatically attach the returned access
 *    token to the shared connection.
 * 2. Call POST /communityPlatform/adminUser/systemConfigs with an
 *    `ICommunityPlatformSystemConfig.ICreate` payload that describes a feature
 *    flag `beta_ui_enabled` set to inactive (is_active=false) and value string
 *    "false".
 * 3. Assert that the response is a well-formed `ICommunityPlatformSystemConfig`:
 *
 *    - `is_active` remains false.
 *    - `category`, `config_key`, `value`, and `description` exactly match the
 *         request body.
 *    - `id`, `created_at`, and `updated_at` are present and pass typia structural
 *         validation.
 *    - `deleted_at` is either null or undefined to represent a non-deleted row.
 */
export async function test_api_system_config_creation_with_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser (dependency: /auth/adminUser/join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a system configuration with is_active = false
  const createBody = {
    category: "feature_flag",
    config_key: "beta_ui_enabled", // feature toggle key
    value: "false", // explicit string payload representing disabled state
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: false,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Business assertions on the created configuration
  // 3-1. Core fields should mirror the request
  TestValidator.equals(
    "category must match the requested feature flag category",
    createdConfig.category,
    createBody.category,
  );
  TestValidator.equals(
    "configuration key must match the requested beta_ui_enabled key",
    createdConfig.config_key,
    createBody.config_key,
  );
  TestValidator.equals(
    "configuration value must match the requested string payload",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "configuration description must match the requested description",
    createdConfig.description,
    createBody.description,
  );

  // 3-2. is_active should remain false and not be auto-flipped to true
  TestValidator.equals(
    "is_active must remain false on initial creation",
    createdConfig.is_active,
    false,
  );

  // 3-3. The configuration should have a valid UUID id and lifecycle timestamps
  // typia.assert has already validated formats, so we only assert non-nullness semantics
  TestValidator.predicate(
    "created configuration id must be a non-empty string",
    createdConfig.id.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp must be a non-empty string",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp must be a non-empty string",
    createdConfig.updated_at.length > 0,
  );

  // 3-4. Newly created configuration should not be soft-deleted
  // deleted_at may be null or undefined, both represent non-deleted state here
  TestValidator.equals(
    "deleted_at should be null or undefined right after creation",
    createdConfig.deleted_at ?? null,
    null,
  );
}
