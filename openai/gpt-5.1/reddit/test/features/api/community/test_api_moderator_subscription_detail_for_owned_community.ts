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

export async function test_api_moderator_subscription_detail_for_owned_community(
  connection: api.IConnection,
) {
  // 1. Register member user (community creator & subscriber)
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

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platform admin, create a visibility level
  const visibilityBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 5. Switch to member user: login explicitly to ensure actor context
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 6. Create a community as the member user
  const communityBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 7. Create a subscription for that community as the same member user
  const subscriptionCreateBody = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(createdSubscription);

  const subscriptionId: string & tags.Format<"uuid"> = createdSubscription.id;

  // Sanity checks on created subscription
  TestValidator.equals(
    "created subscription id should match captured id",
    createdSubscription.id,
    subscriptionId,
  );
  TestValidator.equals(
    "created subscription community_id should match community id",
    createdSubscription.community_id,
    communityId,
  );
  TestValidator.equals(
    "created subscription member_user_id should match member user id",
    createdSubscription.member_user_id,
    memberUserId,
  );

  // 8. Switch to community moderator actor via login
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://moderator.example.com/login",
      referrer: "https://moderator.example.com/home",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 9. As community moderator, fetch the subscription detail
  const moderatorView: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.communityModerator.subscriptions.at(
      connection,
      { subscriptionId },
    );
  typia.assert(moderatorView);

  // 10. Validate that the moderator sees the correct subscription
  TestValidator.equals(
    "moderator view subscription id should equal created subscription id",
    moderatorView.id,
    createdSubscription.id,
  );
  TestValidator.equals(
    "moderator view community_id should equal created community id",
    moderatorView.community_id,
    communityId,
  );
  TestValidator.equals(
    "moderator view member_user_id should equal member user id",
    moderatorView.member_user_id,
    memberUserId,
  );

  // Also verify embedded association summaries for additional safety
  TestValidator.equals(
    "moderator view embedded community summary id should equal community id",
    moderatorView.community.id,
    communityId,
  );
  TestValidator.equals(
    "moderator view embedded memberUser summary id should equal member user id",
    moderatorView.memberUser.id,
    memberUserId,
  );
}
