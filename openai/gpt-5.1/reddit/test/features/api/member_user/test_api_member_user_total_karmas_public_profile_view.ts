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
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

export async function test_api_member_user_total_karmas_public_profile_view(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and become authenticated as platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
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

  // 3. Register first member user (active user)
  const activeMemberPassword = RandomGenerator.alphaNumeric(16);
  const activeMemberJoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(10)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: activeMemberPassword,
    ip: "192.168.0.10",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const activeMemberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: activeMemberJoinBody,
    });
  typia.assert(activeMemberAuthorized);

  const activeMemberId = activeMemberAuthorized.id;

  // 4. As active member user, create a community with that visibility level
  const communityIdentifier = `comm-${RandomGenerator.alphaNumeric(10)}`;
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
    "created community should use requested visibility level code",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 5. As the same active member user, create a subscription to that community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription should point to created community id",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription should belong to active member user",
    subscription.member_user_id,
    activeMemberId,
  );

  // 6. Register second member user (inactive user)
  const inactiveMemberPassword = RandomGenerator.alphaNumeric(16);
  const inactiveMemberJoinBody = {
    username: `inactive_${RandomGenerator.alphaNumeric(10)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: inactiveMemberPassword,
    ip: "192.168.0.11",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const inactiveMemberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: inactiveMemberJoinBody,
    });
  typia.assert(inactiveMemberAuthorized);

  const inactiveMemberId = inactiveMemberAuthorized.id;

  // 7. Build an unauthenticated connection for public access
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Publicly fetch total karmas for the active member user
  const activeKarmas: ICommunityPlatformUserTotalKarmas =
    await api.functional.communityPlatform.memberUsers.totalKarmas.at(
      unauthConn,
      {
        memberUserId: activeMemberId,
      },
    );
  typia.assert(activeKarmas);

  TestValidator.equals(
    "active user karmas should reference active member id",
    activeKarmas.member_user_id,
    activeMemberId,
  );

  TestValidator.predicate(
    "active user total_karma should be non-negative and >= post/comment",
    activeKarmas.total_karma >= 0 &&
      activeKarmas.post_karma >= 0 &&
      activeKarmas.comment_karma >= 0 &&
      activeKarmas.total_karma >= activeKarmas.post_karma &&
      activeKarmas.total_karma >= activeKarmas.comment_karma,
  );

  TestValidator.predicate(
    "active user created_at and updated_at should be non-empty strings",
    typeof activeKarmas.created_at === "string" &&
      activeKarmas.created_at.length > 0 &&
      typeof activeKarmas.updated_at === "string" &&
      activeKarmas.updated_at.length > 0,
  );

  // 9. Publicly fetch total karmas for the inactive member user
  const inactiveKarmas: ICommunityPlatformUserTotalKarmas =
    await api.functional.communityPlatform.memberUsers.totalKarmas.at(
      unauthConn,
      {
        memberUserId: inactiveMemberId,
      },
    );
  typia.assert(inactiveKarmas);

  TestValidator.equals(
    "inactive user karmas should reference inactive member id",
    inactiveKarmas.member_user_id,
    inactiveMemberId,
  );

  TestValidator.predicate(
    "inactive user total_karma should be non-negative and >= post/comment",
    inactiveKarmas.total_karma >= 0 &&
      inactiveKarmas.post_karma >= 0 &&
      inactiveKarmas.comment_karma >= 0 &&
      inactiveKarmas.total_karma >= inactiveKarmas.post_karma &&
      inactiveKarmas.total_karma >= inactiveKarmas.comment_karma,
  );

  TestValidator.predicate(
    "inactive user created_at and updated_at should be non-empty strings",
    typeof inactiveKarmas.created_at === "string" &&
      inactiveKarmas.created_at.length > 0 &&
      typeof inactiveKarmas.updated_at === "string" &&
      inactiveKarmas.updated_at.length > 0,
  );

  // 10. Cross-user consistency checks
  TestValidator.notEquals(
    "active and inactive user ids should differ",
    activeMemberId,
    inactiveMemberId,
  );

  TestValidator.notEquals(
    "active and inactive karmas should belong to different users",
    activeKarmas.member_user_id,
    inactiveKarmas.member_user_id,
  );
}
