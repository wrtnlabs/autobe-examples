import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";

/**
 * Validate that an administrator can retrieve full configuration details for a
 * specific ranking algorithm.
 *
 * 1. Create an administrator account (authentication)
 * 2. As administrator, create a ranking algorithm configuration (random algorithm
 *    name/version, is_active/false, parameters_json is an unusual shape)
 * 3. Retrieve the detail view using algorithmName and version via
 *    /communityPlatform/administrator/rankingAlgorithmConfigs/:algorithmName/:version
 * 4. Assert that all expected fields match (id, algorithm_name, version,
 *    parameters_json, is_active, description). Ensure audit fields are valid
 *    ISO 8601 strings and temporally consistent.
 * 5. (Edge case) Use a non-active version to confirm retrieval works on historical
 *    config.
 */
export async function test_api_ranking_algorithm_config_detail_access_as_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(adminJoin);

  // Step 2: Create a ranking algorithm config with unusual parameters_json and is_active = false
  const algorithmName = `algo_${RandomGenerator.alphaNumeric(8)}`;
  const version = `v${RandomGenerator.alphaNumeric(4)}`;
  const unusualParams = {
    threshold: Math.random(),
    weights: ArrayUtil.repeat(5, () => Math.random()),
    strategy: RandomGenerator.name(),
    meta: {
      experimental: true,
      notes: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 7,
      }),
    },
    edge_case: [null, "", 99999, false],
  };
  const configCreate =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: algorithmName,
          parameters_json: JSON.stringify(unusualParams),
          version,
          is_active: false,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(configCreate);

  // Step 3: Retrieve the detail view as administrator
  const configDetail =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.at(
      connection,
      {
        algorithmName,
        version,
      },
    );
  typia.assert(configDetail);

  // Step 4: Assert key fields and audit information
  TestValidator.equals(
    "algorithm name",
    configDetail.algorithm_name,
    algorithmName,
  );
  TestValidator.equals("version", configDetail.version, version);
  TestValidator.equals(
    "parameters_json",
    configDetail.parameters_json,
    JSON.stringify(unusualParams),
  );
  TestValidator.equals("is_active", configDetail.is_active, false);
  TestValidator.equals(
    "description",
    configDetail.description,
    configCreate.description,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    typeof configDetail.created_at === "string" &&
      !isNaN(Date.parse(configDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    typeof configDetail.updated_at === "string" &&
      !isNaN(Date.parse(configDetail.updated_at)),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    configDetail.deleted_at ?? null,
    null,
  );
  // Validate audit timeline
  TestValidator.predicate(
    "created_at <= updated_at",
    Date.parse(configDetail.created_at) <= Date.parse(configDetail.updated_at),
  );

  // Step 5: Edge case - ensure non-active config retrieval is permitted
  TestValidator.equals(
    "Retrieved config matches creation",
    configDetail,
    configCreate,
    (key) => key === "id" || key === "created_at" || key === "updated_at",
  );
}
