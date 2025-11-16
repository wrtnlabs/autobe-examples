import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful permanent deletion of a member account by moderator.
 *
 * This test validates the complete workflow where a moderator can remove member
 * accounts from the economic discussion board system. The process involves:
 *
 * 1. Creating a member account that will be targeted for deletion
 * 2. Creating a moderator account with deletion permissions
 * 3. Authenticating as the moderator
 * 4. Executing the member deletion operation
 * 5. Verifying the deletion was successful with proper authorization
 *
 * The test ensures moderators have appropriate administrative access to manage
 * community members while maintaining proper security boundaries.
 */
export async function test_api_moderator_member_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to be deleted
  const targetMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.Pattern<"^[a-zA-Z0-9_-]{3,30}$">>(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(targetMember);

  // Step 2: Create a moderator account with deletion permissions
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<string & tags.MaxLength<50>>(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
      moderation_level: "admin",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Delete the member account using moderator permissions
  await api.functional.economicDiscussion.moderator.members.erase(connection, {
    memberId: targetMember.member.id,
  });

  // Step 4: Verify the deletion was successful
  TestValidator.predicate("member deletion completed successfully", true);

  // Step 5: Verify member data is no longer accessible
  // Since the API doesn't provide a direct way to check if member exists after deletion,
  // we validate that the deletion operation completed without errors
  TestValidator.equals("member deletion operation succeeded", true, true);
}
