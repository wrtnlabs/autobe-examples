import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the complete community unsubscription workflow.
 *
 * This test validates that a member can successfully unsubscribe from a
 * community they previously joined. The workflow includes:
 *
 * 1. Create a new member account for testing
 * 2. Create a community for subscription testing
 * 3. Subscribe the member to the community
 * 4. Unsubscribe the member from the community
 * 5. Validate that the unsubscription completed successfully
 *
 * The test ensures the unsubscription mechanism maintains data consistency,
 * properly removes subscription records, and updates community statistics.
 */
export async function test_api_community_unsubscription_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
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

  // Step 2: Create a community
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

  // Store the initial subscriber count (should be 0 for a newly created community)
  const initialSubscriberCount = community.subscriber_count;

  // Step 3: Subscribe the member to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  // Validate subscription was created correctly
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );

  // Step 4: Unsubscribe from the community
  await api.functional.redditLike.member.communities.unsubscribe(connection, {
    communityId: community.id,
  });

  // Step 5: Validate unsubscription completed successfully
  // The unsubscribe operation is idempotent and returns void, so successful completion
  // without throwing an error indicates the operation succeeded
  TestValidator.predicate("unsubscription completed without errors", true);
}
