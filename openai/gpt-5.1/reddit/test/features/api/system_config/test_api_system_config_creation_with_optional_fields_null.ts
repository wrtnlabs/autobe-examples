import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate creation of a community platform system configuration with nullable
 * optional fields explicitly set to null.
 *
 * Business goal:
 *
 * - Ensure that an authenticated adminUser can create a system configuration when
 *   optional fields `category` and `description` are provided as null, and that
 *   the backend persists and returns these fields as null (not omitted or
 *   coerced to empty strings).
 * - Confirm that the active flag and core key/value fields are respected and that
 *   lifecycle fields are initialized correctly for a freshly created
 *   configuration entry.
 *
 * Steps:
 *
 * 1. Register a new adminUser account via POST /auth/adminUser/join to bootstrap
 *    an authenticated admin session.
 * 2. Using the authenticated context, call POST
 *    /communityPlatform/adminUser/systemConfigs to create a new configuration
 *    entry with:
 *
 *    - Category = null
 *    - Description = null
 *    - Config_key = "global_feature_flag_" + random suffix
 *    - Value = "enabled"
 *    - Is_active = true
 * 3. Validate the response ICommunityPlatformSystemConfig object:
 *
 *    - Category is exactly null.
 *    - Description is exactly null.
 *    - Config_key, value, and is_active match the request.
 *    - Id, created_at, updated_at, and deleted_at conform to expected types and
 *         nullability, with deleted_at being null for a new row.
 *
 * Note: The scenario mentions an optional GET-by-id check, but no corresponding
 * SDK function is provided. Therefore, this test focuses on the create response
 * as the source of truth for persistence and null-handling.
 */
export async function test_api_system_config_creation_with_optional_fields_null(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminTestPassword123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 2. Create a system configuration with category and description explicitly null.
  const configKey = `global_feature_flag_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    category: null,
    config_key: configKey,
    value: "enabled",
    description: null,
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(createdConfig);

  // 3. Validate business rules and null-handling semantics.
  TestValidator.equals(
    "system config category should be null when created with category: null",
    createdConfig.category,
    null,
  );

  TestValidator.equals(
    "system config description should be null when created with description: null",
    createdConfig.description,
    null,
  );

  TestValidator.equals(
    "system config config_key should match the requested key",
    createdConfig.config_key,
    configKey,
  );

  TestValidator.equals(
    "system config value should match the requested value",
    createdConfig.value,
    createBody.value,
  );

  TestValidator.equals(
    "system config is_active should reflect the requested active flag",
    createdConfig.is_active,
    createBody.is_active,
  );

  TestValidator.equals(
    "system config deleted_at should be null for a newly created entry",
    createdConfig.deleted_at,
    null,
  );
}
