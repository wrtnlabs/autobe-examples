import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";

/**
 * Validate creation of a ranking event log by administrator.
 *
 * The scenario ensures:
 *
 * 1. An administrator is created and authenticated.
 * 2. Ranking algorithm configuration is created (to reference in event log).
 * 3. Administrator creates a ranking event log referencing the config.
 * 4. Referential integrity (algorithm_config_id matches real config).
 * 5. Only authenticated admins can create event logs.
 * 6. Event log data is returned with all expected metadata and relationships.
 * 7. Verifies that data matches between config and event log linkage.
 *
 * Steps:
 *
 * 1. Create administrator account (join, receive token).
 * 2. Create ranking algorithm config as administrator.
 * 3. Create a ranking event log referencing the config id as administrator.
 * 4. Validate returned event log: referential integrity, metadata, relationship
 *    fields, and authentication enforcement.
 * 5. Test error if attempt to create event log without admin authentication.
 */
export async function test_api_ranking_event_log_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreate = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);
  TestValidator.equals("administrator email", admin.email, adminEmail);

  // 2. Create ranking algorithm configuration as admin
  const algorithmConfigBody = {
    algorithm_name: RandomGenerator.name(1),
    parameters_json: JSON.stringify({ weights: { hot: 1, new: 1 } }),
    version: RandomGenerator.alphaNumeric(6),
    is_active: true,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate;
  const algorithmConfig =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      { body: algorithmConfigBody },
    );
  typia.assert(algorithmConfig);
  TestValidator.equals(
    "algorithm config name",
    algorithmConfig.algorithm_name,
    algorithmConfigBody.algorithm_name,
  );
  TestValidator.equals(
    "algorithm config is_active",
    algorithmConfig.is_active,
    algorithmConfigBody.is_active,
  );
  TestValidator.equals(
    "algorithm config version",
    algorithmConfig.version,
    algorithmConfigBody.version,
  );

  // 3. Create ranking event log by administrator referencing config id
  const startedAt = new Date().toISOString();
  const finishedAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // +10min
  const eventLogBody = {
    algorithm_config_id: algorithmConfig.id,
    event_type: RandomGenerator.pick([
      "calculation",
      "anomaly",
      "recalculation",
      "rollback",
    ] as const),
    interval: RandomGenerator.pick(["day", "week", "month"] as const),
    run_status: RandomGenerator.pick(["success", "error", "warning"] as const),
    event_message: RandomGenerator.paragraph({ sentences: 6 }),
    started_at: startedAt,
    finished_at: finishedAt,
  } satisfies ICommunityPlatformRankingEventLog.ICreate;

  const eventLog =
    await api.functional.communityPlatform.administrator.rankingEventLogs.create(
      connection,
      { body: eventLogBody },
    );
  typia.assert(eventLog);
  TestValidator.equals(
    "referential integrity for algorithm_config_id",
    eventLog.algorithm_config_id,
    algorithmConfig.id,
  );
  TestValidator.equals(
    "event_type matches",
    eventLog.event_type,
    eventLogBody.event_type,
  );
  TestValidator.equals(
    "interval matches",
    eventLog.interval,
    eventLogBody.interval,
  );
  TestValidator.equals(
    "run_status matches",
    eventLog.run_status,
    eventLogBody.run_status,
  );
  TestValidator.equals(
    "event_message matches",
    eventLog.event_message,
    eventLogBody.event_message,
  );
  TestValidator.equals("started_at matches", eventLog.started_at, startedAt);
  TestValidator.equals("finished_at matches", eventLog.finished_at, finishedAt);
  TestValidator.equals(
    "event log algorithm config id matches config id",
    eventLog.algorithmConfig.id,
    algorithmConfig.id,
  );
  TestValidator.equals(
    "event log algorithm config name matches",
    eventLog.algorithmConfig.algorithm_name,
    algorithmConfig.algorithm_name,
  );

  // 4. Check proper authentication is enforced (cannot create event log unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot create ranking event log",
    async () => {
      await api.functional.communityPlatform.administrator.rankingEventLogs.create(
        unauthConn,
        { body: eventLogBody },
      );
    },
  );
}
