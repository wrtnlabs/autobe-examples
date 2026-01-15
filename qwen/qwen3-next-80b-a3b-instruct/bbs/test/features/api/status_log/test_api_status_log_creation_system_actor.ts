import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusLog";
import type { IStatusLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatusLogMetadata";
import { prepare_random_discussion_board_status_log } from "../../../prepare/prepare_random_discussion_board_status_log";
import { generate_random_discussion_board_status_logs_create } from "../../../generate/generate_random_discussion_board_status_logs_create";
export async function test_api_status_log_creation_system_actor(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random target entity ID (UUID)
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  // Create minimal status log data for a system-triggered event with required details
  const statusLogData = {
    status_type: "system_update",
    target_entity_id: targetEntityId,
    details: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardStatusLog.ICreate;
  // Use the generation function to create the status log
  const createdLog = await generate_random_discussion_board_status_logs_create(
    connection,
    { body: statusLogData },
  );
  // Validate the created log matches expected structure
  typia.assert(createdLog);
  // Verify system actor type
  TestValidator.equals(
    "actor type should be system",
    createdLog.actor_type,
    "system",
  );
  // Verify target entity ID matches
  TestValidator.equals(
    "target entity ID matches",
    createdLog.target_entity_id,
    targetEntityId,
  );
  // Verify status type
  TestValidator.equals(
    "status type is system_update",
    createdLog.status_type,
    "system_update",
  );
  // Verify metadata is undefined as expected
  TestValidator.equals(
    "metadata should be undefined",
    createdLog.metadata,
    undefined,
  );
}
