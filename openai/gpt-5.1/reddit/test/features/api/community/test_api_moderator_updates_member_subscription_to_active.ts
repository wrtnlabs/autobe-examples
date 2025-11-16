import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Community moderator activates a member's community subscription.
 *
 * Business flow:
 *
 * 1. Register a platform admin and implicitly authenticate.
 * 2. As platform admin, create a visibility level (e.g., code "public").
 * 3. Register a member user (self-join) and authenticate as that member.
 * 4. As member user, create a community referencing the created visibility level
 *    by code.
 * 5. As the same member user, create a subscription to that community via the
 *    memberUser subscriptions endpoint and capture the returned subscription.
 * 6. Register a community moderator and authenticate as that moderator.
 * 7. (Assume) Moderator is authorized for the community; call the moderator
 *    subscription update endpoint using the subscriptionId from step 5 and set
 *    status to "active" via ICommunityPlatformCommunitySubscription.IUpdate.
 * 8. Assert that the updated subscription:
 *
 *    - Preserves id, member_user_id, and community_id
 *    - Has status updated to "active".
 *
 * Type usage:
 *
 * - Platform admin join/login: ICommunityPlatformPlatformadmin.IJoin / .ILogin.
 * - Member user join/login: ICommunityPlatformMemberuser.IJoinRequest /
 *   .ILoginRequest.
 * - Community create: ICommunityPlatformCommunity.ICreate.
 * - Visibility level create: ICommunityPlatformCommunityVisibilityLevel.ICreate.
 * - Subscription create: ICommunityPlatformCommunitySubscription.ICreate.
 * - Subscription update: ICommunityPlatformCommunitySubscription.IUpdate.
 */
export async function test_api_moderator_updates_member_subscription_to_active(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated by SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: "Visible to everyone and open for subscriptions.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code matches",
    visibility.code,
    visibilityCode,
  );

  // 3. Register member user and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "MemberPassword!234",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // For completeness, login again as member (also tests login DTO wiring)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);
  TestValidator.equals(
    "member id consistent between join and login",
    memberAuthorizedFromLogin.id,
    memberAuthorized.id,
  );

  // 4. As member user, create a community using the visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. As member user, subscribe to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  TestValidator.equals(
    "created subscription member id equals member user id",
    createdSubscription.member_user_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created subscription community id equals community id",
    createdSubscription.community_id,
    community.id,
  );

  // 6. Register community moderator and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: "ModeratorPassword!234",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedFromLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedFromLogin);
  TestValidator.equals(
    "moderator id consistent between join and login",
    moderatorAuthorizedFromLogin.id,
    moderatorAuthorized.id,
  );

  // 7. As moderator, update subscription to status "active"
  const updateBody = {
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.communityModerator.subscriptions.update(
      connection,
      {
        subscriptionId: createdSubscription.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 8. Business assertions: linkage unchanged, status updated
  TestValidator.equals(
    "subscription id is unchanged after moderator update",
    updatedSubscription.id,
    createdSubscription.id,
  );
  TestValidator.equals(
    "member_user_id is immutable across update",
    updatedSubscription.member_user_id,
    createdSubscription.member_user_id,
  );
  TestValidator.equals(
    "community_id is immutable across update",
    updatedSubscription.community_id,
    createdSubscription.community_id,
  );
  TestValidator.equals(
    "subscription status updated to active",
    updatedSubscription.status,
    "active",
  );
}
