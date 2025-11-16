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
 * Validate that a platform administrator can retrieve subscriptions across
 * different communities while enforcing correct community scoping.
 *
 * Business flow:
 *
 * 1. Register a platformAdmin and obtain its authenticated session.
 * 2. Register a memberUser and obtain its authenticated session.
 * 3. As platformAdmin, create a visibility level master (code) that communities
 *    will use.
 * 4. As memberUser, create two communities (A and B) using that visibility level.
 * 5. As memberUser, create one subscription in community A and one in community B.
 * 6. As platformAdmin, GET each subscription by (communityId, subscriptionId) and
 *    verify that the subscription belongs to the specified community.
 * 7. Attempt cross-community retrieval by mixing communityId and subscriptionId
 *    and assert that the calls fail, proving scoping enforcement.
 */
export async function test_api_platform_admin_gets_subscription_for_different_communities(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates and sets Authorization header)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  // 2. Register member user (auto-authenticates and sets Authorization header)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // Ensure memberUser is the current actor (join already logs in, but we can login explicitly)
  const memberLoginBody = {
    identifier: memberJoin.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 3. Switch to platformAdmin to create visibility level
  const platformAdminLoginBody = {
    identifier: platformAdminJoin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // Create a visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to memberUser to create communities A and B
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const communityABody = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(8)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);

  const communityBBody = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(8)}`,
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
        body: communityBBody,
      },
    );
  typia.assert(communityB);

  // 5. As memberUser, create one subscription under community A
  const subscriptionABody = {
    community_id: communityA.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityA.id,
        body: subscriptionABody,
      },
    );
  typia.assert(subscriptionA);

  TestValidator.equals(
    "subscription A community_id should equal community A id",
    subscriptionA.community_id,
    communityA.id,
  );

  // 6. As memberUser, create one subscription under community B
  const subscriptionBBody = {
    community_id: communityB.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityB.id,
        body: subscriptionBBody,
      },
    );
  typia.assert(subscriptionB);

  TestValidator.equals(
    "subscription B community_id should equal community B id",
    subscriptionB.community_id,
    communityB.id,
  );

  // 7. Switch back to platformAdmin to perform scoped GETs
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  // 8. GET subscriptionA via platformAdmin for communityA
  const fetchedA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: communityA.id,
        subscriptionId: subscriptionA.id,
      },
    );
  typia.assert(fetchedA);

  TestValidator.equals(
    "fetchedA id should match subscriptionA id",
    fetchedA.id,
    subscriptionA.id,
  );
  TestValidator.equals(
    "fetchedA community_id should match communityA.id",
    fetchedA.community_id,
    communityA.id,
  );

  // 9. GET subscriptionB via platformAdmin for communityB
  const fetchedB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: communityB.id,
        subscriptionId: subscriptionB.id,
      },
    );
  typia.assert(fetchedB);

  TestValidator.equals(
    "fetchedB id should match subscriptionB id",
    fetchedB.id,
    subscriptionB.id,
  );
  TestValidator.equals(
    "fetchedB community_id should match communityB.id",
    fetchedB.community_id,
    communityB.id,
  );

  // 10. Cross-community mismatch: communityA with subscriptionB
  await TestValidator.error(
    "mixing communityA.id with subscriptionB.id should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
        connection,
        {
          communityId: communityA.id,
          subscriptionId: subscriptionB.id,
        },
      );
    },
  );

  // 10b. Cross-community mismatch: communityB with subscriptionA
  await TestValidator.error(
    "mixing communityB.id with subscriptionA.id should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
        connection,
        {
          communityId: communityB.id,
          subscriptionId: subscriptionA.id,
        },
      );
    },
  );

  // 11. Re-fetch valid subscriptions again to ensure no unintended side effects
  const fetchedAAgain: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: communityA.id,
        subscriptionId: subscriptionA.id,
      },
    );
  typia.assert(fetchedAAgain);

  TestValidator.equals(
    "fetchedAAgain should still reference communityA",
    fetchedAAgain.community_id,
    communityA.id,
  );
  TestValidator.equals(
    "fetchedAAgain id should still equal subscriptionA.id",
    fetchedAAgain.id,
    subscriptionA.id,
  );

  const fetchedBAgain: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: communityB.id,
        subscriptionId: subscriptionB.id,
      },
    );
  typia.assert(fetchedBAgain);

  TestValidator.equals(
    "fetchedBAgain should still reference communityB",
    fetchedBAgain.community_id,
    communityB.id,
  );
  TestValidator.equals(
    "fetchedBAgain id should still equal subscriptionB.id",
    fetchedBAgain.id,
    subscriptionB.id,
  );
}
