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

export async function test_api_moderator_cannot_update_unrelated_subscription(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a visibility level
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
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

  // Helper to build member join body
  const buildMemberJoin = () =>
    ({
      username: RandomGenerator.alphabets(10),
      email: `${RandomGenerator.alphabets(10)}@member.test`,
      password: "P@ssw0rd!",
      ip: "127.0.0.1",
      href: "https://app.local/join",
      referrer: "https://app.local/landing",
    }) satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 3. Register Member A
  const memberAJoinBody = buildMemberJoin();
  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 4. As Member A, create Community A
  const communityACreateBody = {
    identifier: `community-a-${RandomGenerator.alphabets(6)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 5. Register Member B
  const memberBJoinBody = buildMemberJoin();
  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 6. As Member B, create Community B (sharing same visibility level)
  const communityBCreateBody = {
    identifier: `community-b-${RandomGenerator.alphabets(6)}`,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 7. Ensure we are authenticated as Member A again before creating a subscription
  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/login",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoggedIn);

  // 8. As Member A, create a subscription to Community A
  const subscriptionCreateBody = {
    community_id: communityA.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityA.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscriptionA);

  // Sanity check: subscription is tied to Member A and Community A
  TestValidator.equals(
    "subscription member_user_id should be Member A",
    subscriptionA.member_user_id,
    memberALoggedIn.id,
  );
  TestValidator.equals(
    "subscription community_id should be Community A",
    subscriptionA.community_id,
    communityA.id,
  );

  // 9. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@moderator.test`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderation.console.local/join",
    referrer: "https://moderation.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 10. Login as the community moderator to ensure moderator auth context
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderation.console.local/login",
    referrer: "https://moderation.console.local/dashboard",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 11. As moderator, attempt to update Member A's subscription on Community A.
  //     This should fail according to authorization rules (they should only
  //     manage subscriptions for communities they moderate, which should not
  //     include Community A in this setup).
  const forbiddenUpdateBody = {
    status: "rejected",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  await TestValidator.error(
    "community moderator cannot update subscription outside their communities",
    async () => {
      await api.functional.communityPlatform.communityModerator.subscriptions.update(
        connection,
        {
          subscriptionId: subscriptionA.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );
}
