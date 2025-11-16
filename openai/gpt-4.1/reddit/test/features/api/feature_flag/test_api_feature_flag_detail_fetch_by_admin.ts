import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";

/**
 * Validate that a newly registered administrator can retrieve detailed
 * information for a feature flag by its unique flag key.
 *
 * This scenario performs the following steps to ensure feature flag details are
 * correctly retrievable by an authenticated administrator:
 *
 * 1. Register and authenticate as a new administrator:
 *
 *    - Generate a unique administrative email address and password meeting system
 *         requirements.
 *    - Call the administrator join endpoint to create the account and establish
 *         authentication.
 *    - Assert the authentication result contains a valid UUID, email, non-empty
 *         status, and a valid authentication token.
 * 2. Create a uniquely keyed feature flag:
 *
 *    - Construct a unique 'flag_key' value.
 *    - Provide 'flag_type', 'status', and optional 'description' properties.
 *    - Call the administrator featureFlag creation endpoint with these values.
 *    - Assert that the creation returns a full feature flag object containing an id,
 *         matching flag_key and provided properties, and correct timestamp
 *         fields.
 * 3. Fetch the created feature flag details using its key:
 *
 *    - Call the administrator featureFlags.at endpoint with the 'flag_key'.
 *    - Assert that the returned object includes all expected fields (id, flag_key,
 *         flag_type, status, description, created_at, updated_at) and that the
 *         contents match the creation step.
 * 4. Perform deep equality validation between the created feature flag and the
 *    fetched flag object, ignoring any timestamp differences due to update
 *    time. Optional properties (like description and deleted_at) are checked
 *    for consistency.
 */
export async function test_api_feature_flag_detail_fetch_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const authResult = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(authResult);
  TestValidator.predicate(
    "admin id is uuid",
    typeof authResult.id === "string" && !!authResult.id,
  );
  TestValidator.equals("admin email matches", authResult.email, adminEmail);
  TestValidator.predicate(
    "auth token exists",
    typeof authResult.token.access === "string",
  );

  // 2. Create a uniquely keyed feature flag
  const flagKeyBase = RandomGenerator.alphaNumeric(12);
  const flagKey = `flag_${flagKeyBase}`;
  const flagTypeOptions = ["boolean", "percentage_rollout", "variant"] as const;
  const flagType = RandomGenerator.pick(flagTypeOptions);
  const statusOptions = ["enabled", "disabled", "scheduled"] as const;
  const flagStatus = RandomGenerator.pick(statusOptions);
  const description = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 12,
  });
  const createdFlag =
    await api.functional.communityPlatform.administrator.featureFlags.create(
      connection,
      {
        body: {
          flag_key: flagKey,
          flag_type: flagType,
          status: flagStatus,
          description: description,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(createdFlag);
  TestValidator.equals(
    "feature flag key matches input",
    createdFlag.flag_key,
    flagKey,
  );
  TestValidator.equals(
    "feature flag type matches input",
    createdFlag.flag_type,
    flagType,
  );
  TestValidator.equals(
    "feature flag status matches input",
    createdFlag.status,
    flagStatus,
  );
  TestValidator.equals(
    "feature flag description matches input",
    createdFlag.description,
    description,
  );
  TestValidator.predicate(
    "feature flag id is uuid",
    typeof createdFlag.id === "string" && !!createdFlag.id,
  );

  // 3. Fetch feature flag details using its key
  const fetchedFlag =
    await api.functional.communityPlatform.administrator.featureFlags.at(
      connection,
      {
        flagKey: flagKey,
      },
    );
  typia.assert(fetchedFlag);
  TestValidator.equals(
    "fetched flag key matches",
    fetchedFlag.flag_key,
    flagKey,
  );
  TestValidator.equals(
    "fetched flag type matches",
    fetchedFlag.flag_type,
    flagType,
  );
  TestValidator.equals(
    "fetched flag status matches",
    fetchedFlag.status,
    flagStatus,
  );
  TestValidator.equals(
    "fetched flag description matches",
    fetchedFlag.description,
    description,
  );
  TestValidator.predicate(
    "fetched flag id is uuid",
    typeof fetchedFlag.id === "string" && !!fetchedFlag.id,
  );
  // Validate timestamps are ISO strings, but don't require exact match
  TestValidator.predicate(
    "created_at exists on fetched flag",
    typeof fetchedFlag.created_at === "string" && !!fetchedFlag.created_at,
  );
  TestValidator.predicate(
    "updated_at exists on fetched flag",
    typeof fetchedFlag.updated_at === "string" && !!fetchedFlag.updated_at,
  );

  // 4. Deep equality validation, ignoring timestamp and deleted_at fields
  TestValidator.equals(
    "fetched flag matches created flag (ignoring timestamps)",
    {
      ...createdFlag,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
    {
      ...fetchedFlag,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
  );
}
