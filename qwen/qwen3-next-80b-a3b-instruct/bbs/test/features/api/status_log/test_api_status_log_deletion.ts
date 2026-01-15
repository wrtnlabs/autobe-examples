import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
export async function test_api_status_log_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to use as the logId
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Delete the status log entry
  await api.functional.discussionBoard.status_logs.erase(connection, {
    logId: logId,
  });
  // Since the delete operation returns void, we perform a type assertion on the return type
  typia.assert<void>(undefined);
}
