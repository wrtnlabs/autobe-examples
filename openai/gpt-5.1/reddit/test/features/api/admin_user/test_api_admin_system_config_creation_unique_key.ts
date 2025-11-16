import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_admin_system_config_creation_unique_key(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser to obtain an authorized JWT context.
  // The join endpoint will automatically set connection.headers.Authorization
  // with the issued access token, so subsequent admin-only calls will be
  // authenticated as this adminUser.
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

  // 2. Create a new system configuration entry as the authenticated adminUser.
  // Use a realistic category and config_key combination that should be unique
  // within the platform, along with a non-empty value and description.
  const category: string = "auth";
  const configKey: string = "max_login_attempts";
  const value: string = "5";
  const description: string = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    category,
    config_key: configKey,
    value,
    description,
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Validate that basic identity and echo fields match expectations.
  TestValidator.predicate(
    "createdConfig.id must be a non-empty UUID string",
    () => createdConfig.id.length > 0,
  );

  // category is optional and may be undefined/null in the DTO, but in this
  // test we explicitly provided a concrete category value.
  TestValidator.equals(
    "createdConfig.category should equal the requested category",
    createdConfig.category,
    category,
  );

  TestValidator.equals(
    "createdConfig.config_key should equal the requested config_key",
    createdConfig.config_key,
    configKey,
  );

  TestValidator.equals(
    "createdConfig.value should equal the requested value",
    createdConfig.value,
    value,
  );

  TestValidator.equals(
    "createdConfig.description should equal the requested description",
    createdConfig.description,
    description,
  );

  TestValidator.equals(
    "createdConfig.is_active should equal the requested is_active flag",
    createdConfig.is_active,
    true,
  );

  // 4. Validate temporal fields and deletion lifecycle.
  // created_at and updated_at must both be set on creation, and for a freshly
  // created row they should be identical (no further updates yet).
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    () => createdConfig.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    () => createdConfig.updated_at.length > 0,
  );

  TestValidator.equals(
    "created_at and updated_at should be equal immediately after creation",
    createdConfig.created_at,
    createdConfig.updated_at,
  );

  // deleted_at is optional; for a newly created configuration it should be
  // null or undefined (i.e., not logically deleted yet).
  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    () =>
      createdConfig.deleted_at === null ||
      createdConfig.deleted_at === undefined,
  );
}
