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
 * Validate that a member user can retrieve detailed information about one of
 * their own community subscriptions using the scoped subscription detail
 * endpoint.
 *
 * Business workflow:
 *
 * 1. Register a member user (join) and capture their id.
 * 2. Register a platform admin (join) to be able to configure visibility levels.
 * 3. As platform admin, create a community visibility level.
 * 4. Switch back to the member user (login) so subsequent calls run under
 *    memberUser.
 * 5. As member user, create a community using that visibility level.
 * 6. As member user, create a subscription to that community via the scoped
 *    collection endpoint.
 * 7. Retrieve the subscription via the scoped detail endpoint and validate all key
 *    associations.
 */
export async function test_api_member_user_subscription_detail_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a member user via /auth/memberUser/join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Register a platform administrator via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // SDK has now switched Authorization header to platformAdmin via join

  // 3. As platform admin, create a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user context using /auth/memberUser/login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. As member user, create a community using that visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communityId = community.id;

  // 6. As member user, create a subscription to that community
  const subscriptionCreateBody = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  const subscriptionId = createdSubscription.id;

  // Basic sanity checks on the created subscription
  TestValidator.equals(
    "created subscription member_user_id should match memberUserId",
    createdSubscription.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "created subscription community_id should match communityId",
    createdSubscription.community_id,
    communityId,
  );

  // 7. Retrieve the subscription via scoped detail endpoint
  const fetchedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.at(
      connection,
      {
        memberUserId: memberUserId,
        subscriptionId: subscriptionId,
      },
    );
  typia.assert(fetchedSubscription);

  // 8. Validate key business expectations
  TestValidator.equals(
    "subscription id should match created subscription id",
    fetchedSubscription.id,
    subscriptionId,
  );

  TestValidator.equals(
    "subscription member_user_id should equal memberUserId",
    fetchedSubscription.member_user_id,
    memberUserId,
  );

  TestValidator.equals(
    "subscription community_id should equal communityId",
    fetchedSubscription.community_id,
    communityId,
  );

  TestValidator.equals(
    "subscription status should match initially created status",
    fetchedSubscription.status,
    createdSubscription.status,
  );

  TestValidator.equals(
    "embedded memberUser.id should match member_user_id",
    fetchedSubscription.memberUser.id,
    fetchedSubscription.member_user_id,
  );

  TestValidator.equals(
    "embedded community.id should match community_id",
    fetchedSubscription.community.id,
    fetchedSubscription.community_id,
  );
}
