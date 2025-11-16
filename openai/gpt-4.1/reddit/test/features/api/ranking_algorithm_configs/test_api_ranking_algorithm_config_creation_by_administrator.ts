import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";

/**
 * Verify administrator creation of a ranking algorithm configuration.
 *
 * 1. Register a new administrator account and log in for authentication.
 * 2. Create an initial configuration for a new algorithm (all required fields,
 *    is_active true).
 * 3. Create an additional version for the same algorithm (change version string,
 *    is_active false, with optional description).
 * 4. Assert all response fields including audit fields are set and not null.
 * 5. Attempt to create a duplicate configuration with the same algorithm_name and
 *    version and verify failure.
 * 6. Attempt creation with unauthenticated connection and verify it is forbidden.
 */
export async function test_api_ranking_algorithm_config_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status: RandomGenerator.pick([
          null,
          undefined,
          "full-time",
          "superadmin",
        ]),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create initial config (active)
  const configBase = {
    algorithm_name: RandomGenerator.name(2),
    parameters_json: JSON.stringify({ weight: Math.random(), window: 42 }),
  };
  const version1 = RandomGenerator.alphaNumeric(8);
  const createBody1 = {
    ...configBase,
    version: version1,
    is_active: true,
  } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate;
  const config1: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      { body: createBody1 },
    );
  typia.assert(config1);
  TestValidator.equals(
    "algorithm name matches",
    config1.algorithm_name,
    createBody1.algorithm_name,
  );
  TestValidator.equals("version matches", config1.version, createBody1.version);
  TestValidator.equals("is_active true", config1.is_active, true);
  TestValidator.predicate(
    "parameters_json is set",
    typeof config1.parameters_json === "string" &&
      !!config1.parameters_json.length,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof config1.created_at === "string" &&
      !isNaN(Date.parse(config1.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof config1.updated_at === "string" &&
      !isNaN(Date.parse(config1.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    config1.deleted_at,
    null,
  );

  // 3. Create new config version (inactive, with description)
  const version2 = RandomGenerator.alphaNumeric(8);
  const createBody2 = {
    ...configBase,
    version: version2,
    is_active: false,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate;
  const config2: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      { body: createBody2 },
    );
  typia.assert(config2);
  TestValidator.equals(
    "algorithm name matches (inactive version)",
    config2.algorithm_name,
    createBody2.algorithm_name,
  );
  TestValidator.equals("version matches (inactive)", config2.version, version2);
  TestValidator.equals("is_active false", config2.is_active, false);
  TestValidator.equals(
    "description is set",
    config2.description,
    createBody2.description,
  );
  TestValidator.predicate(
    "parameters_json is set",
    typeof config2.parameters_json === "string" &&
      !!config2.parameters_json.length,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof config2.created_at === "string" &&
      !isNaN(Date.parse(config2.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof config2.updated_at === "string" &&
      !isNaN(Date.parse(config2.updated_at)),
  );

  // 4. Attempt duplicate [algorithm_name, version]
  await TestValidator.error(
    "duplicate [algorithm_name, version] pair should fail",
    async () => {
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
        connection,
        { body: { ...createBody1 } },
      );
    },
  );

  // 5. Attempt creation as unauthenticated (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create ranking config",
    async () => {
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
        unauthConn,
        { body: { ...createBody1, version: RandomGenerator.alphaNumeric(8) } },
      );
    },
  );
}
