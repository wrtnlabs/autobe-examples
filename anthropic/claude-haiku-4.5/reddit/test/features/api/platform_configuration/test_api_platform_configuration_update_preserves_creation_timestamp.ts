import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that configuration creation timestamp is preserved and immutable
 * through multiple update operations.
 *
 * This test ensures that the `created_at` timestamp of a platform configuration
 * remains unchanged when the configuration value is updated multiple times. The
 * `updated_at` timestamp should reflect each modification, while `created_at`
 * maintains its original value, creating an accurate audit trail of when the
 * configuration was originally created versus when it was last modified.
 *
 * The test workflow:
 *
 * 1. Authenticate as platform administrator
 * 2. Create a new platform configuration
 * 3. Perform multiple update operations on the configuration
 * 4. Verify that `created_at` never changes while `updated_at` updates
 * 5. Confirm timestamp immutability constraint is enforced correctly
 */
export async function test_api_platform_configuration_update_preserves_creation_timestamp(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: adminName,
        href: "http://localhost:3000/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new platform configuration
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "true";
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });

  const createdConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: initialValue,
          description: initialDescription,
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // Capture the original created_at and initial updated_at timestamps
  const originalCreatedAt: string = createdConfig.created_at;
  let previousUpdatedAt: string = createdConfig.updated_at;

  TestValidator.predicate(
    "created_at should be in valid ISO 8601 format",
    () => !isNaN(Date.parse(originalCreatedAt)),
  );

  // 3. First update: modify configuration value and description
  const firstUpdateValue = "false";
  const firstUpdateDescription = RandomGenerator.paragraph({ sentences: 2 });

  const firstUpdate: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: firstUpdateValue,
          description: firstUpdateDescription,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(firstUpdate);

  // Verify created_at is unchanged after first update
  TestValidator.equals(
    "created_at should remain unchanged after first update",
    firstUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after first update",
    firstUpdate.updated_at,
    previousUpdatedAt,
  );

  previousUpdatedAt = firstUpdate.updated_at;

  // 4. Second update: modify configuration value again
  const secondUpdateValue = "true";
  const secondUpdateDescription = RandomGenerator.paragraph({ sentences: 3 });

  const secondUpdate: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: secondUpdateValue,
          description: secondUpdateDescription,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(secondUpdate);

  // Verify created_at is still unchanged after second update
  TestValidator.equals(
    "created_at should remain unchanged after second update",
    secondUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after second update",
    secondUpdate.updated_at,
    previousUpdatedAt,
  );

  previousUpdatedAt = secondUpdate.updated_at;

  // 5. Third update: modify only description
  const thirdUpdateDescription = RandomGenerator.paragraph({ sentences: 1 });

  const thirdUpdate: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: secondUpdateValue,
          description: thirdUpdateDescription,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(thirdUpdate);

  // Verify created_at is still unchanged after third update
  TestValidator.equals(
    "created_at should remain unchanged after third update",
    thirdUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after third update",
    thirdUpdate.updated_at,
    previousUpdatedAt,
  );

  // 6. Final verification: ensure configuration key is immutable
  TestValidator.equals(
    "configuration key should remain immutable",
    thirdUpdate.key,
    configKey,
  );

  // Verify all timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "all created_at values should be valid ISO 8601 format",
    () => !isNaN(Date.parse(thirdUpdate.created_at)),
  );

  TestValidator.predicate(
    "all updated_at values should be valid ISO 8601 format",
    () => !isNaN(Date.parse(thirdUpdate.updated_at)),
  );

  // Verify updated_at is always after or equal to created_at
  TestValidator.predicate(
    "updated_at should be after or equal to created_at",
    () =>
      new Date(thirdUpdate.updated_at).getTime() >=
      new Date(thirdUpdate.created_at).getTime(),
  );
}
