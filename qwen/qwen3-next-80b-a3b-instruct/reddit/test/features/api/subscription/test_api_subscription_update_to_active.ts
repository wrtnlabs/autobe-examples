import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

export async function test_api_subscription_update_to_active(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication and subscription creation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(10);
  const memberPassword: string = "MySecurePassword123";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a community that the member can subscribe to
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create an initial subscription for the member
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Deactivate the subscription first, creating the state to be reactivated
  const deactivatedSubscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(deactivatedSubscription);
  TestValidator.equals(
    "subscription should be deactivated",
    deactivatedSubscription.active,
    false,
  );

  // 5. Reactivate the subscription
  const reactivatedSubscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(reactivatedSubscription);
  TestValidator.equals(
    "subscription should be reactivated",
    reactivatedSubscription.active,
    true,
  );

  // 6. Verify that the user can only modify their own subscriptions
  // Switch to a different member account
  const differentMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const differentMemberUsername: string = RandomGenerator.alphaNumeric(10);
  const differentMemberPassword: string = "DifferentPassword123";
  const differentMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: differentMemberEmail,
        username: differentMemberUsername,
        password: differentMemberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(differentMember);

  // Try to update the original subscription with different member's connection
  await TestValidator.error(
    "different member should not be able to update another member's subscription",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.update(
        connection,
        {
          subscriptionId: subscription.id,
          body: {
            active: false,
          } satisfies ICommunityPlatformSubscription.IUpdate,
        },
      );
    },
  );
}
