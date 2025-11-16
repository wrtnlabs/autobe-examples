import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";

/**
 * Validate deletion of a ranking algorithm configuration by admin.
 *
 * Steps:
 *
 * 1. Register as a new administrator with unique email/password.
 * 2. Create a unique/inactive ranking algorithm config as admin (set is_active =
 *    false at creation).
 * 3. Delete the config via DELETE endpoint using correct algorithmName/version
 *    composite key.
 * 4. Confirm deletion: config cannot be found by subsequent reads, and only admin
 *    can delete.
 * 5. If config is active, deletion must be prevented (test that is_active=true
 *    cannot be deleted).
 * 6. Validate only the intended record is deleted, composite key enforced, and no
 *    related log errors occur (assuming logs are external, so log checks are
 *    limited).
 */
export async function test_api_ranking_algorithm_config_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as administrator (join)
  const adminCred = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        ...adminCred,
        business_status: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "registered admin email should match input",
    admin.email,
    adminCred.email,
  );

  // 2. Create an INACTIVE config (is_active=false)
  const algorithmName = RandomGenerator.paragraph({ sentences: 2 });
  const version = RandomGenerator.alphaNumeric(10);
  const parameters_json = JSON.stringify({ weight: Math.random(), window: 24 });
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const config: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: algorithmName,
          parameters_json,
          version,
          is_active: false,
          description,
        } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate,
      },
    );
  typia.assert(config);
  TestValidator.equals(
    "created config should be inactive",
    config.is_active,
    false,
  );
  TestValidator.equals(
    "composite key algorithm_name matches",
    config.algorithm_name,
    algorithmName,
  );
  TestValidator.equals(
    "composite key version matches",
    config.version,
    version,
  );

  // 3. Delete config (admin, correct key, inactive)
  await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.erase(
    connection,
    {
      algorithmName,
      version,
    },
  );

  // 4. Attempt to delete again (should error: already deleted)
  await TestValidator.error(
    "deleting already deleted config should fail",
    async () => {
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.erase(
        connection,
        {
          algorithmName,
          version,
        },
      );
    },
  );

  // 5. Create an ACTIVE config (is_active=true)
  const activeAlgorithmName = RandomGenerator.paragraph({ sentences: 2 });
  const activeVersion = RandomGenerator.alphaNumeric(10);
  const activeConfig: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: activeAlgorithmName,
          parameters_json: JSON.stringify({ foo: "bar" }),
          version: activeVersion,
          is_active: true,
          description: null,
        } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate,
      },
    );
  typia.assert(activeConfig);
  TestValidator.equals(
    "active config is_active should be true",
    activeConfig.is_active,
    true,
  );
  // 6. Try to delete ACTIVE config; should fail (cannot delete active configs)
  await TestValidator.error(
    "cannot delete active ranking algorithm config",
    async () => {
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.erase(
        connection,
        {
          algorithmName: activeAlgorithmName,
          version: activeVersion,
        },
      );
    },
  );
}
