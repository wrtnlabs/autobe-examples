import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";

/**
 * Validates administrator-driven update of environment metadata immediately
 * after creation.
 *
 * This scenario exercises:
 *
 * 1. Administrator account creation and authentication, establishing privileged
 *    context
 * 2. Creation of a new environment with unique env_key, display_name, and
 *    description
 * 3. Update of the environment's display_name and description to new unique values
 * 4. Validation that display_name and description update correctly, and updated_at
 *    reflects change
 * 5. Soft-deletion (retirement/archival) by setting deleted_at, verifying the
 *    environment is marked retired
 * 6. Ensures all changes are available after each update, and only administrators
 *    can perform them
 */
export async function test_api_environment_update_after_creation(
  connection: api.IConnection,
) {
  // 1. Create an administrator account and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create a new environment
  const envKey: string = RandomGenerator.alphaNumeric(10);
  const displayName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const description: string = RandomGenerator.paragraph({ sentences: 5 });
  const environment: ICommunityPlatformEnvironment =
    await api.functional.communityPlatform.administrator.environments.create(
      connection,
      {
        body: {
          env_key: envKey,
          display_name: displayName,
          description,
        } satisfies ICommunityPlatformEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  TestValidator.equals("env_key as requested", environment.env_key, envKey);
  TestValidator.equals(
    "display_name as requested",
    environment.display_name,
    displayName,
  );
  TestValidator.equals(
    "description as requested",
    environment.description,
    description,
  );
  TestValidator.equals(
    "deleted_at should be null on creation",
    environment.deleted_at,
    null,
  );

  // 3. Update the environment's display_name and description
  const newDisplayName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const newDescription: string = RandomGenerator.paragraph({ sentences: 6 });
  const updatedEnvironment: ICommunityPlatformEnvironment =
    await api.functional.communityPlatform.administrator.environments.update(
      connection,
      {
        envKey,
        body: {
          display_name: newDisplayName,
          description: newDescription,
        } satisfies ICommunityPlatformEnvironment.IUpdate,
      },
    );
  typia.assert(updatedEnvironment);
  TestValidator.equals(
    "display_name updated",
    updatedEnvironment.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "description updated",
    updatedEnvironment.description,
    newDescription,
  );
  TestValidator.equals("env_key unchanged", updatedEnvironment.env_key, envKey);
  TestValidator.notEquals(
    "updated_at changes on update",
    updatedEnvironment.updated_at,
    environment.updated_at,
  );

  // 4. Soft-delete (archive/retire) the environment by setting deleted_at
  const deletedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const retiredEnvironment: ICommunityPlatformEnvironment =
    await api.functional.communityPlatform.administrator.environments.update(
      connection,
      {
        envKey,
        body: {
          deleted_at: deletedAt,
        } satisfies ICommunityPlatformEnvironment.IUpdate,
      },
    );
  typia.assert(retiredEnvironment);
  TestValidator.equals(
    "deleted_at set for soft deletion",
    retiredEnvironment.deleted_at,
    deletedAt,
  );
  TestValidator.equals(
    "env_key unchanged after soft deletion",
    retiredEnvironment.env_key,
    envKey,
  );
  TestValidator.notEquals(
    "updated_at changes on soft deletion",
    retiredEnvironment.updated_at,
    updatedEnvironment.updated_at,
  );
}
