import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

export async function test_api_subscription_erase_by_member(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8);
  const memberPassword: string = "StrongPass123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a community for subscription
  const communityName: string = RandomGenerator.alphaNumeric(5);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a subscription to the community
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

  // 4. Permanently delete the subscription
  await api.functional.communityPlatform.member.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // 5. Verify the deletion by creating a new subscription to the same community
  // This should succeed because the original subscription was permanently deleted
  const newSubscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(newSubscription);

  // 6. Verify that the new subscription is different from the deleted one
  // (Different ID confirms that the deletion and re-subscription created a fresh record)
  TestValidator.notEquals(
    "new subscription ID should differ from deleted subscription ID",
    newSubscription.id,
    subscription.id,
  );
}
