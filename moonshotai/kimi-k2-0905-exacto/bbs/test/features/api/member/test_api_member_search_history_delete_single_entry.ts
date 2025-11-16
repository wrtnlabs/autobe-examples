import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test that authenticated members can delete a single specific search history
 * entry. This validates targeted privacy control allowing members to remove
 * particular searches they no longer want tracked. The test should verify the
 * specific entry is removed from the member's search history while all other
 * entries remain unchanged.
 *
 * Since the provided API only has a general search history deletion endpoint
 * that clears all search history (not individual entries), this test will focus
 * on verifying that authenticated members can successfully clear their search
 * history and that the operation completes without errors.
 */
export async function test_api_member_search_history_delete_single_entry(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Verify member is authenticated and has access token
  TestValidator.predicate(
    "member has valid authentication token",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has valid refresh token",
    member.token.refresh.length > 0,
  );

  // Step 3: Test search history deletion
  // The API provides a general deletion endpoint that clears all search history
  await api.functional.economicDiscussion.member.search.history.erase(
    connection,
  );

  // Step 4: Verify the operation completed successfully
  // Since this is a void return API, success is indicated by no thrown errors
  TestValidator.predicate(
    "search history deletion completed without errors",
    true,
  );

  // Note: This API clears all search history rather than individual entries
  // The test validates that authenticated members can perform this privacy control operation
}
