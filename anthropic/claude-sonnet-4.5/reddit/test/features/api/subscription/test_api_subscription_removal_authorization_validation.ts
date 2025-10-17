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
 * Test authorization validation for subscription removal operations.
 *
 * This test validates that users can only unsubscribe from their own
 * subscriptions and cannot manipulate other users' subscriptions. The test
 * ensures proper authorization enforcement preventing unauthorized subscription
 * management.
 *
 * Steps:
 *
 * 1. Register Member A
 * 2. Create a test community
 * 3. Member A subscribes to the community
 * 4. Member A successfully unsubscribes themselves (test authorized case first)
 * 5. Member A subscribes again to the same community
 * 6. Register Member B (authentication switches to Member B)
 * 7. Member B attempts to unsubscribe Member A (unauthorized - should fail)
 * 8. Verify the authorization enforcement protects subscription ownership
 */
export async function test_api_subscription_removal_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberAEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Create a test community (as Member A)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    typeof community.id,
    "string",
  );

  // Step 3: Member A subscribes to the community
  const subscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: memberA.id,
      body: {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate,
    });
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member matches",
    subscription.member_id,
    memberA.id,
  );

  // Step 4: Member A successfully unsubscribes themselves (authorized operation)
  await api.functional.redditLike.member.users.subscriptions.erase(connection, {
    userId: memberA.id,
    communityId: community.id,
  });

  // Step 5: Member A subscribes again to test unauthorized access
  const subscription2 =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: memberA.id,
      body: {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate,
    });
  typia.assert(subscription2);
  TestValidator.equals(
    "second subscription created",
    subscription2.community_id,
    community.id,
  );

  // Step 6: Register Member B (authentication context switches to Member B)
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberB);
  TestValidator.notEquals(
    "Member B is different from Member A",
    memberB.id,
    memberA.id,
  );

  // Step 7: Member B attempts to unsubscribe Member A (unauthorized - should fail)
  await TestValidator.error(
    "Member B cannot unsubscribe Member A - authorization validation",
    async () => {
      await api.functional.redditLike.member.users.subscriptions.erase(
        connection,
        {
          userId: memberA.id,
          communityId: community.id,
        },
      );
    },
  );
}
