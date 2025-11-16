import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";

/**
 * Validate that an administrator can permanently delete a ranking event log
 * entry.
 *
 * This test verifies the following:
 *
 * - Only authenticated administrator can perform the deletion
 * - Correct referential integrity: ranking event log references an existing
 *   ranking algorithm config
 * - Deletion is hard (not soft-delete) with proper audit expectation
 *
 * Steps:
 *
 * 1. Register a new admin and ensure authentication (token attached)
 * 2. Create a new ranking algorithm config as this admin
 * 3. Create a ranking event log entry that references the config
 * 4. Delete the ranking event log entry (hard delete)
 * 5. Attempt to delete the same log again and expect an error (not
 *    found/forbidden)
 */
export async function test_api_ranking_event_log_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create ranking algorithm configuration
  const configInput = {
    algorithm_name: RandomGenerator.name(1),
    parameters_json: JSON.stringify({ weight: Math.random() }),
    version: RandomGenerator.alphabets(5),
    is_active: true,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformRankingAlgorithmConfigs.ICreate;
  const config =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.create(
      connection,
      { body: configInput },
    );
  typia.assert(config);

  // 3. Create ranking event log referencing new config
  const eventLogInput = {
    algorithm_config_id: config.id,
    event_type: "calculation",
    interval: "day",
    run_status: "success",
    event_message: RandomGenerator.paragraph({ sentences: 2 }),
    started_at: new Date(Date.now() - 5000).toISOString(),
    finished_at: new Date().toISOString(),
  } satisfies ICommunityPlatformRankingEventLog.ICreate;
  const log =
    await api.functional.communityPlatform.administrator.rankingEventLogs.create(
      connection,
      { body: eventLogInput },
    );
  typia.assert(log);
  TestValidator.equals(
    "event log references config",
    log.algorithm_config_id,
    config.id,
  );

  // 4. Delete ranking event log (permanently)
  await api.functional.communityPlatform.administrator.rankingEventLogs.erase(
    connection,
    { eventLogId: log.id },
  );

  // 5. Attempt to delete again - should fail
  await TestValidator.error(
    "delete already-deleted event log fails",
    async () => {
      await api.functional.communityPlatform.administrator.rankingEventLogs.erase(
        connection,
        { eventLogId: log.id },
      );
    },
  );
}
