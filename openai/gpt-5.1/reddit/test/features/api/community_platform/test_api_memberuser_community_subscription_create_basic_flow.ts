import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_memberuser_community_subscription_create_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to prepare visibility level master data
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level that communities can reference
  const visibilityCode = "public";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (this call will also set the member user's token)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community referencing the created visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Member user subscribes to the created community
  const subscriptionStatus = "active";
  const subscriptionCreateBody = {
    community_id: community.id,
    status: subscriptionStatus,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 6. Validate cross-entity consistency and business rules
  TestValidator.equals(
    "subscription member_user_id should equal authenticated member user id",
    subscription.member_user_id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "subscription community_id should equal created community id",
    subscription.community_id,
    community.id,
  );

  TestValidator.equals(
    "embedded memberUser summary id should equal subscription member_user_id",
    subscription.memberUser.id,
    subscription.member_user_id,
  );

  TestValidator.equals(
    "embedded community summary id should equal subscription community_id",
    subscription.community.id,
    subscription.community_id,
  );

  TestValidator.equals(
    "subscription status should match requested status",
    subscription.status,
    subscriptionStatus,
  );

  // Basic sanity checks on timestamps (typia.assert already checks format)
  TestValidator.predicate(
    "subscription created_at should be a non-empty string",
    subscription.created_at.length > 0,
  );

  TestValidator.predicate(
    "subscription updated_at should be a non-empty string",
    subscription.updated_at.length > 0,
  );
}
