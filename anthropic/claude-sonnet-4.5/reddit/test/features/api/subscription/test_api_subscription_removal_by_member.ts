import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test the complete workflow of a member unsubscribing from a community.
 *
 * This test validates that a member can successfully unsubscribe from a
 * community they previously subscribed to. The test ensures:
 *
 * 1. A member can register and authenticate
 * 2. A community can be created
 * 3. The member can subscribe to the community
 * 4. The member can unsubscribe from the community
 * 5. The unsubscription operation completes successfully
 */
export async function test_api_subscription_removal_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 15,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Subscribe the member to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: member.id,
      body: {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate,
    });
  typia.assert(subscription);

  // Verify subscription was created correctly
  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member matches",
    subscription.member_id,
    member.id,
  );

  // Step 4: Unsubscribe the member from the community
  await api.functional.redditLike.member.users.subscriptions.erase(connection, {
    userId: member.id,
    communityId: community.id,
  });

  // The unsubscription operation returns void, so successful completion
  // without throwing an error indicates the operation was successful
}
