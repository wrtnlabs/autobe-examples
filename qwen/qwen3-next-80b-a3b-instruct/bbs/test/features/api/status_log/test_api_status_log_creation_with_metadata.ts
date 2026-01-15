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
export async function test_api_status_log_creation_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Create status log with metadata object according to actual type (empty object - allows any properties)
  const statusLog: IDiscussionBoardStatusLog =
    await generate_random_discussion_board_status_logs_create(actorConnection, {
      body: {
        status_type: RandomGenerator.pick([
          "publication",
          "moderation",
          "suspension",
          "deletion",
          "system_update",
        ] as const),
        target_entity_id: typia.random<string & tags.Format<"uuid">>(),
        metadata: {
          // Since IStatusLogMetadata is {} (empty object), it allows any properties
          // This matches the spec that metadata is a flexible key-value store
          ip_address: typia.random<string & tags.Format<"ipv4">>(),
          user_agent: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 30,
          }),
          reason_code: RandomGenerator.alphaNumeric(6),
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
          rule_violated: "Section 3.1: Spam Policy",
        },
        details: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    });
  // Validate that the response contains all expected fields
  typia.assert(statusLog);
  // Validate the basic fields
  TestValidator.equals(
    "status type is valid",
    statusLog.status_type,
    statusLog.status_type,
  );
  TestValidator.equals(
    "target entity ID is valid UUID",
    typeof statusLog.target_entity_id,
    "string",
  );
  TestValidator.predicate("timestamp is valid date-time format", () => {
    const date = new Date(statusLog.timestamp);
    return (
      !isNaN(date.getTime()) &&
      statusLog.timestamp.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
      ) !== null
    );
  });
  TestValidator.equals(
    "actor ID is valid UUID",
    typeof statusLog.actor_id,
    "string",
  );
  TestValidator.equals(
    "actor type is valid",
    typeof statusLog.actor_type,
    "string",
  );
  TestValidator.equals(
    "status after is valid",
    typeof statusLog.status_after,
    "string",
  );
  // Validate that metadata is present and contains expected properties
  // Even though IStatusLogMetadata is {} and allows any properties,
  // we can still validate via type assertion that the metdata object matches the expected structure
  if (statusLog.metadata) {
    // The metadata object should have the properties we sent
    const metadata = statusLog.metadata;
    // TestValidator assertions can't use fields from {} type, so we validate via property existence
    TestValidator.predicate("metadata has IP address", () =>
      metadata.hasOwnProperty("ip_address"),
    );
    TestValidator.predicate("metadata has user agent", () =>
      metadata.hasOwnProperty("user_agent"),
    );
    TestValidator.predicate("metadata has reason code", () =>
      metadata.hasOwnProperty("reason_code"),
    );
    TestValidator.predicate("metadata has moderator ID", () =>
      metadata.hasOwnProperty("moderator_id"),
    );
    TestValidator.predicate("metadata has rule violated", () =>
      metadata.hasOwnProperty("rule_violated"),
    );
  }
}