import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
export async function test_api_authentication_log_update_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authentication log entry directly for testing
  // Note: We use the update endpoint to create a log entry since no separate create endpoint exists
  const initialLog =
    await api.functional.discussionBoard.authentication_logs.update(
      connection,
      {
        logId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X)",
        } satisfies IDiscussionBoardAuthenticationLog.IUpdate,
      },
    );
  typia.assert(initialLog);
  // Step 2: Update the created log with new context data
  const updatedLog =
    await api.functional.discussionBoard.authentication_logs.update(
      connection,
      {
        logId: initialLog.id,
        body: {
          ip_address: "10.0.0.5",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        } satisfies IDiscussionBoardAuthenticationLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Step 3: Validate immutability of core fields
  TestValidator.equals("Log ID unchanged", updatedLog.id, initialLog.id);
  TestValidator.equals(
    "User ID unchanged",
    updatedLog.user_id,
    initialLog.user_id,
  );
  TestValidator.equals(
    "Creation timestamp unchanged",
    updatedLog.created_at,
    initialLog.created_at,
  );
  TestValidator.equals(
    "Authentication result unchanged",
    updatedLog.authentication_result,
    initialLog.authentication_result,
  );
  TestValidator.equals(
    "Authentication method unchanged",
    updatedLog.authentication_method,
    initialLog.authentication_method,
  );
  // Step 4: Validate that context fields were properly updated
  TestValidator.equals("IP address updated", updatedLog.ip_address, "10.0.0.5");
  TestValidator.equals(
    "User agent updated",
    updatedLog.user_agent,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  );
}
