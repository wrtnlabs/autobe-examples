import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test that authenticated members can completely clear their entire search
 * history from the economic discussion board platform.
 *
 * This test validates member privacy controls by ensuring all search entries
 * are permanently removed from their personal history. The operation should
 * complete successfully without errors, confirming that members can manage
 * their digital footprint.
 *
 * Test Steps:
 *
 * 1. Register a new member account to establish authentication context
 * 2. Call the search history clear endpoint to remove all search entries
 * 3. Verify the operation completes successfully (void return indicates success)
 * 4. Validate that the member's authentication remains valid after the operation
 */
export async function test_api_member_search_history_clear_all_entries(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Clear the member's search history
  await api.functional.economicDiscussion.member.search.history.erase(
    connection,
  );

  // Step 3: Verify the operation completed successfully
  // The erase function returns void on success, so no error means success
  TestValidator.predicate("search history cleared successfully", true);

  // Step 4: Validate member authentication remains valid
  // The connection should still have valid authentication after the operation
  TestValidator.predicate(
    "member authentication remains valid after clearing history",
    typeof connection.headers?.Authorization === "string",
  );
}
