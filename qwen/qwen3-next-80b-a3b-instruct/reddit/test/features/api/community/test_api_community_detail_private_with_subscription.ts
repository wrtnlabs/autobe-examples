import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

export async function test_api_community_detail_private_with_subscription(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(10);
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a private community
  const communityName: string = `private-community-${RandomGenerator.alphaNumeric(8)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Verify community is private (isPublic=false)
  TestValidator.equals(
    "community should be private",
    community.isPublic,
    false,
  );

  // 3. Subscribe the member to the private community
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

  // Verify subscription is active
  TestValidator.equals(
    "subscription should be active",
    subscription.active,
    true,
  );

  // 4. Retrieve the community details as the subscribed member
  const retrievedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);

  // Verify retrieved community matches created community
  TestValidator.equals(
    "retrieved community ID matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved community name matches",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "retrieved community isPublic matches",
    retrievedCommunity.isPublic,
    community.isPublic,
  );

  // Validate description: should match created value or be undefined/both null/undefined
  if (community.description === undefined || community.description === null) {
    TestValidator.equals(
      "retrieved community description should be null/undefined",
      retrievedCommunity.description,
      community.description,
    );
  } else {
    TestValidator.equals(
      "retrieved community description should match",
      retrievedCommunity.description,
      community.description,
    );
  }

  TestValidator.equals(
    "retrieved community owner has access",
    retrievedCommunity.isPublic,
    false,
  );
}
