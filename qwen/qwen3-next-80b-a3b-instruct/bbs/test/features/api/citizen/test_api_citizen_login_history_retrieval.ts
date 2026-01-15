import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
export async function test_api_citizen_login_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen account using the generation utility function
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser =
    await generate_random_discussion_board_users_create(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePassword123!",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(citizen);
  // Step 2: Retrieve the login history for the created citizen using their ID (using base connection as endpoint is public)
  const loginHistoryRaw = await api.functional.discussionBoard.citizens.login_history.index(
    connection,
    {
      citizenId: citizen.id,
    },
  );
  const loginHistory: IDiscussionBoardAuthenticationLog[] = typia.assert<IDiscussionBoardAuthenticationLog[]>(loginHistoryRaw);
  typia.assert(loginHistory);
  // Step 3: Validate that at least one login history entry exists (the account creation login)
  TestValidator.predicate(
    "at least one login entry exists",
    loginHistory.length >= 1,
  );
  // Step 4: Verify that the login history contains the expected authentication log structure
  // Validate first log (the creation event) has correct properties and structure
  const firstLog = loginHistory[0];
  TestValidator.equals(
    "first log citizen ID matches",
    firstLog.user_id,
    citizen.id,
  );
  TestValidator.equals(
    "first log authentication result is success",
    firstLog.authentication_result,
    "success",
  );
  // Validate all logs have proper structure
  for (const log of loginHistory) {
    // Use typia.assert to validate entire structure (no need for individual typeof checks)
    typia.assert(log);
    // Ensure required fields have expected values
    TestValidator.equals("log has valid UUID ID", log.id.length > 0, true);
    TestValidator.equals(
      "log has valid citizen ID format",
      typeof log.user_id,
      "string",
    );
    TestValidator.equals(
      "log has non-empty IP address", 
      log.ip_address.length > 0, 
      true
    );
    TestValidator.equals(
      "log has non-empty user agent", 
      log.user_agent.length > 0, 
      true
    );
    TestValidator.equals(
      "log has authentication method", 
      log.authentication_method.length > 0, 
      true
    );
    TestValidator.equals(
      "log has valid authentication result", 
      ["success", "failure", "blocked", "expired"].includes(
        log.authentication_result
      ), 
      true
    );
    // Ensure citizen ID matches the one we used
    TestValidator.equals(
      "log user_id matches citizen ID",
      log.user_id,
      citizen.id,
    );
    // Ensure no personally identifiable information beyond authentication logs is exposed
    // Email and username should NOT be present in authentication logs
    TestValidator.predicate("email not exposed in log", !("email" in log));
    TestValidator.predicate(
      "username not exposed in log",
      !("username" in log),
    );
    TestValidator.predicate(
      "display_name not exposed in log",
      !("display_name" in log),
    );
    TestValidator.predicate("bio not exposed in log", !("bio" in log));
  }
  // Step 5: Validate that login history entries are ordered by descending created_at timestamp
  // Use TestValidator.index to validate ordered results against sorted expected values
  if (loginHistory.length > 1) {
    const sortedByDate = [...loginHistory].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    TestValidator.index(
      "login history sorted by descending created_at",
      sortedByDate,
      loginHistory,
    );
  }
}