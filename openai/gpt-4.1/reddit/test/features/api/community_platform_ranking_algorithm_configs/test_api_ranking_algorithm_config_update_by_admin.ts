import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";

/**
 * Administrator can successfully update an existing ranking algorithm
 * configuration.
 *
 * 1. Register a new administrator for privileged access
 * 2. Create a new ranking algorithm configuration to ensure there's one to update
 * 3. Update the configuration (by its algorithm_name and version) with new
 *    parameters_json, description, and is_active
 * 4. Assert the updated record correctly reflects changes, preserves unique
 *    fields/audit trail
 */
export async function test_api_ranking_algorithm_config_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    },
  });
  typia.assert(admin);

  // 2. Create ranking algorithm config for a unique algorithm/version
  const algorithmName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 7,
  }).replace(/\s/g, "_");
  const version = RandomGenerator.alphaNumeric(8);
  const parametersJSON1 = JSON.stringify({
    weight: Math.random(),
    decay: Math.random(),
  });
  const description1 = RandomGenerator.paragraph({ sentences: 6 });

  const configCreated =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: algorithmName,
          parameters_json: parametersJSON1,
          version: version,
          description: description1,
          is_active: true,
        },
      },
    );
  typia.assert(configCreated);

  // 3. Update the ranking algorithm config
  const parametersJSON2 = JSON.stringify({
    weight: Math.random(),
    decay: Math.random(),
    refreshed: true,
  });
  const description2 = RandomGenerator.paragraph({ sentences: 5 });

  const configUpdated =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.update(
      connection,
      {
        algorithmName: algorithmName,
        version: version,
        body: {
          parameters_json: parametersJSON2,
          description: description2,
          is_active: false,
        },
      },
    );
  typia.assert(configUpdated);

  // 4. Assertions
  // id/algorithm_name/version should remain unchanged
  TestValidator.equals(
    "id must be the same",
    configUpdated.id,
    configCreated.id,
  );
  TestValidator.equals(
    "algorithm_name unchanged",
    configUpdated.algorithm_name,
    algorithmName,
  );
  TestValidator.equals("version unchanged", configUpdated.version, version);
  // parameters_json, description, is_active updated
  TestValidator.equals(
    "parameters_json updated",
    configUpdated.parameters_json,
    parametersJSON2,
  );
  TestValidator.equals(
    "description updated",
    configUpdated.description,
    description2,
  );
  TestValidator.equals(
    "is_active should be false after update",
    configUpdated.is_active,
    false,
  );
  // Audit trail fields
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(configUpdated.updated_at) >= new Date(configUpdated.created_at),
  );
  TestValidator.equals(
    "deleted_at unchanged / still null",
    configUpdated.deleted_at,
    configCreated.deleted_at ?? null,
  );
}
