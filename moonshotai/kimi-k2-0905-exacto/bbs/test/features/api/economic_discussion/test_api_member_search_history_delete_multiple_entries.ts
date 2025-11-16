import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test that authenticated members can delete search history entries. This test
 * validates that authenticated members can successfully remove their search
 * history while unauthenticated requests are properly rejected.
 *
 * Implementation strategy:
 *
 * 1. Create a new member account for authentication
 * 2. Test search history deletion functionality for authenticated members
 * 3. Test proper error handling for unauthenticated requests
 * 4. Note: Current API only supports bulk deletion of all search history entries
 */
export async function test_api_member_search_history_delete_multiple_entries(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test search history deletion functionality
  // The current API provides bulk deletion of all search history entries
  await api.functional.economicDiscussion.member.search.history.erase(
    connection,
  );

  // Create unauthenticated connection for testing error handling
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test unauthenticated access attempt
  await TestValidator.error(
    "unauthenticated member cannot delete search history",
    async () => {
      await api.functional.economicDiscussion.member.search.history.erase(
        unauthConn,
      );
    },
  );
}
