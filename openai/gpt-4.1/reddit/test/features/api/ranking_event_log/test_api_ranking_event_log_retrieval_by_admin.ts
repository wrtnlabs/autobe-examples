import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";

/**
 * Validate that an administrator can retrieve a ranking event log by unique ID.
 *
 * Scenario:
 *
 * 1. Register a new administrator account.
 * 2. Log in as the administrator (join operation grants tokens).
 * 3. Create a ranking algorithm configuration for the event log to reference.
 * 4. Create a ranking event log that references the created algorithm config.
 * 5. Retrieve the ranking event log by its id as administrator.
 * 6. Confirm response field values match creation and reference structure.
 * 7. Confirm algorithmConfig field in response is a summary DTO referring to the
 *    config used above.
 * 8. Attempt to retrieve a non-existent event log and expect an error (optional,
 *    not testing TypeErrors).
 */
export async function test_api_ranking_event_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminAuthorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create a ranking algorithm configuration
  const rankingConfigInput = {
    algorithm_name: RandomGenerator.name(1),
    parameters_json: JSON.stringify({ weight: Math.random() }),
    version: RandomGenerator.alphaNumeric(6),
    is_active: true,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate;
  const rankingConfig: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: rankingConfigInput,
      },
    );
  typia.assert(rankingConfig);

  // 3. Create a ranking event log referencing the config
  const now = new Date();
  const startedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const finishedAt = new Date(now.getTime()).toISOString();
  const rankingEventLogInput = {
    algorithm_config_id: rankingConfig.id,
    event_type: RandomGenerator.name(1),
    interval: RandomGenerator.pick(["day", "week", "month"] as const),
    run_status: RandomGenerator.pick(["success", "error", "warning"] as const),
    event_message: RandomGenerator.paragraph({ sentences: 2 }),
    started_at: startedAt,
    finished_at: finishedAt,
  } satisfies ICommunityPlatformRankingEventLog.ICreate;
  const createdEventLog: ICommunityPlatformRankingEventLog =
    await api.functional.communityPlatform.administrator.rankingEventLogs.create(
      connection,
      {
        body: rankingEventLogInput,
      },
    );
  typia.assert(createdEventLog);

  // 4. Retrieve the ranking event log by its unique ID
  const retrieved: ICommunityPlatformRankingEventLog =
    await api.functional.communityPlatform.administrator.rankingEventLogs.at(
      connection,
      {
        eventLogId: createdEventLog.id,
      },
    );
  typia.assert(retrieved);

  // 5. Field-level assertions
  TestValidator.equals(
    "event log id matches",
    retrieved.id,
    createdEventLog.id,
  );
  TestValidator.equals(
    "algorithm config id matches",
    retrieved.algorithm_config_id,
    rankingConfig.id,
  );
  TestValidator.equals(
    "event_type matches",
    retrieved.event_type,
    rankingEventLogInput.event_type,
  );
  TestValidator.equals(
    "interval matches",
    retrieved.interval,
    rankingEventLogInput.interval,
  );
  TestValidator.equals(
    "run_status matches",
    retrieved.run_status,
    rankingEventLogInput.run_status,
  );
  TestValidator.equals(
    "event_message matches",
    retrieved.event_message,
    rankingEventLogInput.event_message,
  );
  TestValidator.equals(
    "started_at matches",
    retrieved.started_at,
    rankingEventLogInput.started_at,
  );
  TestValidator.equals(
    "finished_at matches",
    retrieved.finished_at,
    rankingEventLogInput.finished_at,
  );
  // 6. Confirm response's algorithmConfig field is a summary DTO referring to the correct config
  typia.assert(retrieved.algorithmConfig);
  TestValidator.equals(
    "algorithmConfig.id matches",
    retrieved.algorithmConfig.id,
    rankingConfig.id,
  );
  TestValidator.equals(
    "algorithmConfig.algorithm_name matches",
    retrieved.algorithmConfig.algorithm_name,
    rankingConfigInput.algorithm_name,
  );
  TestValidator.equals(
    "algorithmConfig.version matches",
    retrieved.algorithmConfig.version,
    rankingConfigInput.version,
  );
}
