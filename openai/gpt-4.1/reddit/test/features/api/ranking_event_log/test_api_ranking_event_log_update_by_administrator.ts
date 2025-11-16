import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";

/**
 * End-to-end test for updating a ranking event log entry by an administrator.
 *
 * 1. Register and authenticate as administrator
 * 2. Create primary ranking algorithm config (for original event log)
 * 3. Optionally create a second config (for update to swap configs)
 * 4. Create an initial ranking event log referencing primary config
 * 5. Prepare new values for the update (mutate everything allowed)
 * 6. Update the event log
 * 7. Assert that all updatable fields have changed, immutable/ID fields are
 *    unmodified
 * 8. Try updating a non-existent event log and verify error
 */
export async function test_api_ranking_event_log_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: admin_email,
        password: admin_password,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create first ranking algorithm config
  const configA: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: RandomGenerator.pick([
            "hot",
            "top",
            "controversial",
            "new",
          ] as const),
          parameters_json: JSON.stringify({
            window: RandomGenerator.pick([24, 72, 168]),
          }),
          version: RandomGenerator.alphaNumeric(8),
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate,
      },
    );
  typia.assert(configA);

  // 3. Optionally create a second config to use during update (new association)
  const configB: ICommunityPlatformRankingAlgorithmConfigs =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      {
        body: {
          algorithm_name: RandomGenerator.pick([
            "hot",
            "top",
            "controversial",
            "new",
          ] as const),
          parameters_json: JSON.stringify({
            window: RandomGenerator.pick([48, 168, 720]),
          }),
          version: RandomGenerator.alphaNumeric(8),
          is_active: false,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate,
      },
    );
  typia.assert(configB);

  // 4. Create an initial ranking event log referencing configA
  const eventLog: ICommunityPlatformRankingEventLog =
    await api.functional.communityPlatform.administrator.rankingEventLogs.create(
      connection,
      {
        body: {
          algorithm_config_id: configA.id,
          event_type: RandomGenerator.pick([
            "calculation",
            "anomaly",
            "rollback",
            "recalculation",
          ] as const),
          interval: RandomGenerator.pick(["day", "week", "month"] as const),
          run_status: RandomGenerator.pick([
            "success",
            "error",
            "warning",
          ] as const),
          event_message: RandomGenerator.paragraph({ sentences: 3 }),
          started_at: new Date(Date.now() - 20000).toISOString(),
          finished_at: new Date(Date.now() - 10000).toISOString(),
        } satisfies ICommunityPlatformRankingEventLog.ICreate,
      },
    );
  typia.assert(eventLog);

  // 5. Prepare update: mutate allowed fields, swap to configB
  const update_body = {
    event_type: RandomGenerator.pick([
      "calculation",
      "anomaly",
      "rollback",
      "recalculation",
    ] as const),
    interval: RandomGenerator.pick(["day", "week", "month"] as const),
    run_status: RandomGenerator.pick(["success", "error", "warning"] as const),
    event_message: RandomGenerator.paragraph({ sentences: 4 }),
    started_at: new Date(Date.now() - 6000).toISOString(),
    finished_at: new Date(Date.now() - 1000).toISOString(),
    algorithm_config_id: configB.id,
  } satisfies ICommunityPlatformRankingEventLog.IUpdate;

  // 6. Execute the update
  const updated: ICommunityPlatformRankingEventLog =
    await api.functional.communityPlatform.administrator.rankingEventLogs.update(
      connection,
      {
        eventLogId: eventLog.id,
        body: update_body,
      },
    );
  typia.assert(updated);
  TestValidator.equals("event log id stays the same", updated.id, eventLog.id);
  TestValidator.notEquals(
    "algorithm_config_id changed",
    updated.algorithm_config_id,
    eventLog.algorithm_config_id,
  );
  TestValidator.notEquals(
    "interval changed",
    updated.interval,
    eventLog.interval,
  );
  TestValidator.notEquals(
    "run_status changed",
    updated.run_status,
    eventLog.run_status,
  );
  TestValidator.notEquals(
    "event_type changed",
    updated.event_type,
    eventLog.event_type,
  );
  TestValidator.equals(
    "algorithm config id after update equals configB",
    updated.algorithm_config_id,
    configB.id,
  );
  TestValidator.equals(
    "event_type after update",
    updated.event_type,
    update_body.event_type,
  );
  TestValidator.equals(
    "interval after update",
    updated.interval,
    update_body.interval,
  );
  TestValidator.equals(
    "run_status after update",
    updated.run_status,
    update_body.run_status,
  );
  TestValidator.equals(
    "event_message after update",
    updated.event_message,
    update_body.event_message,
  );
  TestValidator.equals(
    "started_at after update",
    updated.started_at,
    update_body.started_at,
  );
  TestValidator.equals(
    "finished_at after update",
    updated.finished_at,
    update_body.finished_at,
  );
  // Check referential integrity for config details
  TestValidator.equals(
    "algorithm config in event log summary id is configB",
    updated.algorithmConfig.id,
    configB.id,
  );

  // 7. Try updating a non-existent log, expect error
  await TestValidator.error(
    "updating non-existent event log should fail",
    async () => {
      await api.functional.communityPlatform.administrator.rankingEventLogs.update(
        connection,
        {
          eventLogId: typia.random<string & tags.Format<"uuid">>(),
          body: update_body,
        },
      );
    },
  );
}
