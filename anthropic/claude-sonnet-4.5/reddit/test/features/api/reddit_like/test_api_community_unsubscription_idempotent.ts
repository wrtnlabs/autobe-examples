import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test idempotent community unsubscription behavior.
 *
 * This test validates that attempting to unsubscribe from a community when no
 * subscription exists is handled gracefully. The system should demonstrate
 * idempotent behavior, allowing the unsubscribe operation to succeed without
 * errors regardless of the current subscription state.
 *
 * Test Steps:
 *
 * 1. Register a new member account
 * 2. Create a new community (member becomes creator)
 * 3. Directly attempt to unsubscribe without creating a subscription first
 * 4. Verify the operation succeeds without errors
 *
 * This ensures the system handles edge cases like double-clicks, network
 * retries, and out-of-sync client state without data corruption or error
 * responses.
 */
export async function test_api_community_unsubscription_idempotent(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a new community
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Attempt to unsubscribe from the community without having subscribed
  // This should succeed gracefully due to idempotent design
  await api.functional.redditLike.member.communities.unsubscribe(connection, {
    communityId: community.id,
  });

  // Step 4: Verify no errors were thrown (implicit by reaching this point)
  // The operation should complete successfully without exceptions
  // This demonstrates idempotent behavior - safe to call regardless of subscription state
}
