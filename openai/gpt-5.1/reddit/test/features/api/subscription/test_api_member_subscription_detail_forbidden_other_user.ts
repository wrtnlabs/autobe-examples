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

/**
 * Validate that a member user cannot access another member user's subscription
 * detail, while they can still access their own subscription record.
 *
 * Business context: The subscription detail endpoint GET
 * /communityPlatform/memberUser/subscriptions/{subscriptionId} returns a full
 * ICommunityPlatformCommunitySubscription record for the authenticated member
 * user. Since subscriptions reveal which communities a user follows, this
 * endpoint must enforce strict ownership-based access control. A member user
 * should only be able to load subscription rows where they are the owner;
 * accessing someone else's subscriptionId must fail.
 *
 * Scenario steps:
 *
 * 1. Platform admin joins and is authenticated (for visibility level creation).
 * 2. Platform admin creates a community visibility level (e.g. PUBLIC).
 * 3. Member user A joins and becomes the authenticated actor.
 * 4. Member user A creates a community using the created visibility level.
 * 5. Member user A creates a subscription to that community, capturing
 *    subscriptionId_A.
 * 6. Member user B joins and becomes the authenticated actor.
 * 7. Member user B attempts to GET subscriptionId_A and this call must fail with
 *    some authorization error (status is implementation-defined).
 * 8. Member user B creates their own community and subscription
 *    (subscriptionId_B).
 * 9. Member user B successfully GETs subscriptionId_B and we verify the
 *    subscription belongs to B and references the correct community.
 */
export async function test_api_member_subscription_detail_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticated as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "created visibility level code matches requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user A joins (SDK switches Authorization header to memberUser A)
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberAPass123!",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 4. Member user A creates a community using the visibility level code
  const communityACreateBody = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);
  TestValidator.equals(
    "community A visibility level code matches created level",
    communityA.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Member user A creates subscription to community A
  const subscriptionACreateBody = {
    community_id: communityA.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionACreateBody },
    );
  typia.assert(subscriptionA);

  TestValidator.equals(
    "subscription A member_user_id should equal member A id",
    subscriptionA.member_user_id,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "subscription A community_id should equal community A id",
    subscriptionA.community_id,
    communityA.id,
  );

  // 6. Member user B joins (Authorization switches to memberUser B)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberBPass123!",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 7. As member user B, attempt to GET subscription A detail and expect error
  await TestValidator.error(
    "member B cannot access subscription A detail",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.at(
        connection,
        {
          subscriptionId: subscriptionA.id,
        },
      );
    },
  );

  // 8. Member user B creates their own community
  const communityBCreateBody = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 9. Member user B creates subscription to community B and can access it
  const subscriptionBCreateBody = {
    community_id: communityB.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBCreateBody },
    );
  typia.assert(subscriptionB);

  const fetchedSubscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: subscriptionB.id,
      },
    );
  typia.assert(fetchedSubscriptionB);

  TestValidator.equals(
    "fetched subscription B id matches created subscription B id",
    fetchedSubscriptionB.id,
    subscriptionB.id,
  );
  TestValidator.equals(
    "fetched subscription B member_user_id equals member B id",
    fetchedSubscriptionB.member_user_id,
    memberBAuthorized.id,
  );
  TestValidator.equals(
    "fetched subscription B community_id equals community B id",
    fetchedSubscriptionB.community_id,
    communityB.id,
  );
}
