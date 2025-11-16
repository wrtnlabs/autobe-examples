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
 * Validate that a member user can retrieve details of their own community
 * subscription.
 *
 * Business workflow:
 *
 * 1. Register a new member user via /auth/memberUser/join and keep their id and
 *    credentials.
 * 2. Register a new platform admin via /auth/platformAdmin/join so we can
 *    configure visibility levels.
 * 3. While authenticated as the platform admin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels using its
 *    business code.
 * 4. Log back in as the member user via /auth/memberUser/login to restore
 *    memberUser context.
 * 5. As the member user, create a community via
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level code.
 * 6. Still as the same member user, create a subscription to that community via
 *    /communityPlatform/memberUser/subscriptions and capture the subscription
 *    id.
 * 7. Retrieve that subscription via GET
 *    /communityPlatform/memberUser/subscriptions/{subscriptionId} using
 *    api.functional.communityPlatform.memberUser.subscriptions.at.
 * 8. Assert that the retrieved subscription belongs to the authenticated member
 *    user, references the created community, preserves the status, and that the
 *    embedded memberUser and community summaries are consistent with the
 *    foreign key ids.
 */
export async function test_api_member_subscription_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register a platform admin and 3. create visibility level as platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Log back in as the member user to perform memberUser operations
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/login-referrer",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  TestValidator.equals(
    "member id must stay consistent between join and login",
    memberAuthorizedAfterLogin.id,
    memberId,
  );

  // 5. As member user, create a community using the previously created visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
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
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Create a subscription for that community as the same member user
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  TestValidator.equals(
    "created subscription should have expected member_user_id",
    createdSubscription.member_user_id,
    memberId,
  );

  TestValidator.equals(
    "created subscription should reference the created community",
    createdSubscription.community_id,
    community.id,
  );

  // 7. Retrieve the subscription by id using memberUser subscriptions.at
  const fetchedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(fetchedSubscription);

  // 8. Business-logic assertions: ownership, community linkage, status consistency, and embedded summaries
  TestValidator.equals(
    "fetched subscription id should match created subscription id",
    fetchedSubscription.id,
    createdSubscription.id,
  );

  TestValidator.equals(
    "fetched subscription member_user_id should match created subscription and member id",
    fetchedSubscription.member_user_id,
    createdSubscription.member_user_id,
  );

  TestValidator.equals(
    "fetched subscription community_id should match created subscription and community id",
    fetchedSubscription.community_id,
    createdSubscription.community_id,
  );

  TestValidator.equals(
    "subscription status must be preserved between creation and retrieval",
    fetchedSubscription.status,
    createdSubscription.status,
  );

  TestValidator.equals(
    "embedded memberUser summary id should equal subscription member_user_id",
    fetchedSubscription.memberUser.id,
    fetchedSubscription.member_user_id,
  );

  TestValidator.equals(
    "embedded community summary id should equal subscription community_id",
    fetchedSubscription.community.id,
    fetchedSubscription.community_id,
  );

  await TestValidator.predicate(
    "embedded community summary slug should be non-empty",
    async () => fetchedSubscription.community.slug.length > 0,
  );
}
