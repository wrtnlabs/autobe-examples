import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";

/**
 * Validate the creation of a new platform feature flag by an administrator.
 *
 * This test ensures an administrator can register a new feature flag with all
 * required fields, the uniqueness of flag_key is enforced, and the audit fields
 * are correctly set. The test will:
 *
 * 1. Register a new administrator (authenticate as admin)
 * 2. Create a new feature flag (with flag_key, flag_type, status, and optional
 *    description)
 * 3. Verify the created flag matches expectations
 * 4. Attempt to create a flag with duplicate flag_key and verify it fails
 */
export async function test_api_feature_flag_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator (authenticate as admin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare feature flag creation
  const flagKey = "feature_" + RandomGenerator.alphaNumeric(10);
  const flagTypeOptions = ["boolean", "percentage_rollout", "variant"] as const;
  const statusOptions = ["enabled", "disabled", "scheduled"] as const;

  const flagCreateBody = {
    flag_key: flagKey,
    flag_type: RandomGenerator.pick(flagTypeOptions),
    status: RandomGenerator.pick(statusOptions),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformFeatureFlag.ICreate;

  // 3. Create the feature flag
  const featureFlag: ICommunityPlatformFeatureFlag =
    await api.functional.communityPlatform.administrator.featureFlags.create(
      connection,
      { body: flagCreateBody },
    );
  typia.assert(featureFlag);

  // 4. Validate creation
  TestValidator.equals(
    "flag_key value matches input",
    featureFlag.flag_key,
    flagCreateBody.flag_key,
  );
  TestValidator.equals(
    "flag_type value matches input",
    featureFlag.flag_type,
    flagCreateBody.flag_type,
  );
  TestValidator.equals(
    "status value matches input",
    featureFlag.status,
    flagCreateBody.status,
  );
  TestValidator.equals(
    "description value matches input",
    featureFlag.description,
    flagCreateBody.description,
  );

  // Validate audit fields exist and are ISO date-time strings
  TestValidator.predicate(
    "created_at is present and valid ISO date-time",
    typeof featureFlag.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        featureFlag.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is present and valid ISO date-time",
    typeof featureFlag.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        featureFlag.updated_at,
      ),
  );
  // deleted_at can be null or undefined at creation
  TestValidator.equals(
    "deleted_at should be null or undefined on creation",
    featureFlag.deleted_at,
    null,
  );

  // 5. Attempt to create another feature flag with the same key (should fail)
  await TestValidator.error(
    "duplicate flag_key should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.featureFlags.create(
        connection,
        { body: { ...flagCreateBody } },
      );
    },
  );
}
