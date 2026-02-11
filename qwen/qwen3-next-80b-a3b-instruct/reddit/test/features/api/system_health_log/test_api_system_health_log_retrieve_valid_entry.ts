import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_log_retrieve_valid_entry(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for system health log
  const healthLogId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the system health log entry using the generated UUID
  const retrievedLog =
    await api.functional.redditCommunity.system_health_logs.at(connection, {
      healthLogId,
    });
  // Validate the retrieved log entry against type definition
  typia.assert(retrievedLog);
  // Validate field types and constraints
  TestValidator.equals(
    "id is UUID format",
    typia.is<string & tags.Format<"uuid">>(retrievedLog.id),
    true,
  );
  TestValidator.predicate(
    "status is a string",
    typeof retrievedLog.status === "string",
  );
  TestValidator.predicate(
    "component is a string",
    typeof retrievedLog.component === "string",
  );
  TestValidator.predicate(
    "message is a string",
    typeof retrievedLog.message === "string",
  );
  TestValidator.predicate(
    "metadata is string or null",
    retrievedLog.metadata === null || typeof retrievedLog.metadata === "string",
  );
  TestValidator.equals(
    "created_at has ISO date-time format",
    typia.is<string & tags.Format<"date-time">>(retrievedLog.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at has ISO date-time format",
    typia.is<string & tags.Format<"date-time">>(retrievedLog.updated_at),
    true,
  );
  TestValidator.equals("deleted_at is null", retrievedLog.deleted_at, null);
}
