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
export async function test_api_status_log_creation(
  connection: api.IConnection,
): Promise<void> {
  // Generate random test data for required fields
  const statusType = "publication";
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const actorType = "citizen";
  const statusAfter = "published";
  const details = RandomGenerator.content({ paragraphs: 2 });
  const metadata: IStatusLogMetadata | undefined = {
    ip_address: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    reason: "Article published by user",
  };
  // Create the status log request body with required fields and optional metadata
  const requestBody = {
    status_type: statusType,
    target_entity_id: targetEntityId,
    metadata: metadata,
    details: details,
  } satisfies IDiscussionBoardStatusLog.ICreate;
  // Use the generation utility function for POST /discussionBoard/status-logs
  const statusLog = await generate_random_discussion_board_status_logs_create(
    connection, // Pass connection directly since this utility calls auth internally and the endpoint doesn't require auth
    { body: requestBody },
  );
  // Validate the response using typia.assert (handles complete type safety)
  typia.assert(statusLog);
  // Validate key fields match what was sent (business logic validation)
  TestValidator.equals(
    "status_type matches",
    statusLog.status_type,
    statusType,
  );
  TestValidator.equals(
    "target_entity_id matches",
    statusLog.target_entity_id,
    targetEntityId,
  );
  TestValidator.equals("actor_type matches", statusLog.actor_type, actorType);
  TestValidator.equals(
    "status_after matches",
    statusLog.status_after,
    statusAfter,
  );
  // Validate metadata matches (metadata is in the response)
  TestValidator.equals("metadata matches", statusLog.metadata, metadata);
  // Verify system-generated fields are populated
  TestValidator.notEquals("id is generated", statusLog.id, "");
  TestValidator.notEquals("timestamp is generated", statusLog.timestamp, "");
  TestValidator.predicate(
    "actor_id is present",
    () => statusLog.actor_id !== undefined,
  );
  // Test that null metadata is handled properly
  const requestBodyNoMetadata = {
    status_type: "moderation",
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    details: RandomGenerator.paragraph(),
  } satisfies IDiscussionBoardStatusLog.ICreate;
  const statusLogNoMetadata =
    await generate_random_discussion_board_status_logs_create(connection, {
      body: requestBodyNoMetadata,
    });
  typia.assert(statusLogNoMetadata);
  TestValidator.equals(
    "metadata is undefined when not provided",
    statusLogNoMetadata.metadata,
    undefined,
  );
}
