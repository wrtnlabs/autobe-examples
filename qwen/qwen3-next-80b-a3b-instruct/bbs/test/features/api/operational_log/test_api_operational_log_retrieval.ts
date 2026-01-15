import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardOperationalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardOperationalLog";
export async function test_api_operational_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a random operational log entry using the system's random generation
  const operationalLog: IDiscussionBoardOperationalLog =
    api.functional.discussionBoard.operational_logs.at.random();
  typia.assert(operationalLog);
  // Step 2: Use the generated log's UUID to retrieve the exact same log entry
  const retrievedLog: IDiscussionBoardOperationalLog =
    await api.functional.discussionBoard.operational_logs.at(connection, {
      logId: operationalLog.id,
    });
  typia.assert(retrievedLog);
  // Step 3: Validate that the retrieved log matches the original log
  TestValidator.equals(
    "retrieved log ID matches generated log ID",
    retrievedLog.id,
    operationalLog.id,
  );
  TestValidator.equals(
    "retrieved log action matches generated log action",
    retrievedLog.action,
    operationalLog.action,
  );
  TestValidator.equals(
    "retrieved log actor matches generated log actor",
    retrievedLog.actor,
    operationalLog.actor,
  );
  TestValidator.equals(
    "retrieved log target resource matches generated log target resource",
    retrievedLog.target_resource,
    operationalLog.target_resource,
  );
  TestValidator.equals(
    "retrieved log event severity matches generated log event severity",
    retrievedLog.event_severity,
    operationalLog.event_severity,
  );
  TestValidator.equals(
    "retrieved log status matches generated log status",
    retrievedLog.status,
    operationalLog.status,
  );
  TestValidator.equals(
    "retrieved log created at matches generated log created at",
    retrievedLog.created_at,
    operationalLog.created_at,
  );
}
