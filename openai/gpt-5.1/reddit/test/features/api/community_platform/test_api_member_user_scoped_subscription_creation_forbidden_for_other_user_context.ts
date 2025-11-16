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
 * Ensure that a member user cannot create a community subscription for another
 * member user by abusing the scoped memberUserId path.
 *
 * Business context:
 *
 * - Member users should only be able to create subscriptions for themselves.
 * - The endpoint POST
 *   /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions
 *   derives the subscription owner from the path parameter and the
 *   authenticated principal. Authorization must ensure these agree for regular
 *   member users.
 *
 * Test flow:
 *
 * 1. Register Member A via /auth/memberUser/join and capture memberA.id and
 *    credentials.
 * 2. Register Member B via /auth/memberUser/join with independent credentials.
 * 3. Register a platform admin via /auth/platformAdmin/join and create a
 *    visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Switch to Member A (login) and create a community using the created
 *    visibility level code.
 * 5. Switch to Member B (login) and attempt to create a subscription for Member A
 *    by calling POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId_A}/subscriptions
 *    with a body targeting Member A's community. Expect this to fail with a
 *    business-logic authorization error, asserted via TestValidator.error.
 * 6. Switch back to Member A (login) and create a legitimate subscription for
 *    Member A's own community using the same endpoint but with memberUserId =
 *    memberA.id and authenticated as Member A. Assert that the call succeeds
 *    and that the returned subscription is correctly bound to memberA.id and
 *    the community.id.
 */
export async function test_api_member_user_scoped_subscription_creation_forbidden_for_other_user_context(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(10);

  const memberAJoinBody = {
    username: memberAUsername,
    email: memberAEmail,
    password: memberAPassword,
    href: "https://example.com/join/member-a",
    referrer: "https://example.com/referrer/member-a",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register Member B
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(10);

  const memberBJoinBody = {
    username: memberBUsername,
    email: memberBEmail,
    password: memberBPassword,
    href: "https://example.com/join/member-b",
    referrer: "https://example.com/referrer/member-b",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // Sanity check: Member A and Member B must be different users
  TestValidator.notEquals(
    "member A and member B must have different ids",
    memberA.id,
    memberB.id,
  );

  // 3. Register a platform admin and create a visibility level
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminDisplayName = RandomGenerator.name();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: adminDisplayName,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/referrer",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const visibilityLevelBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Visibility ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to Member A and create a community
  const memberALoginBody = {
    identifier: memberAEmail,
    password: memberAPassword,
    href: "https://example.com/login/member-a",
    referrer: "https://example.com/login-referrer/member-a",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Switch to Member B and attempt forbidden cross-user subscription
  const memberBLoginBody = {
    identifier: memberBEmail,
    password: memberBPassword,
    href: "https://example.com/login/member-b",
    referrer: "https://example.com/login-referrer/member-b",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  await TestValidator.error(
    "member B must not be able to create subscription for member A using memberA.id in path",
    async () => {
      const forbiddenBody = {
        community_id: community.id,
        status: "active",
      } satisfies ICommunityPlatformCommunitySubscription.ICreate;

      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
        connection,
        {
          memberUserId: memberA.id,
          body: forbiddenBody,
        },
      );
    },
  );

  // 6. Switch back to Member A and create a legitimate self-scoped subscription
  const memberALoginAgainBody = {
    identifier: memberAEmail,
    password: memberAPassword,
    href: "https://example.com/login/member-a-2",
    referrer: "https://example.com/login-referrer/member-a-2",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginAgainBody,
    });
  typia.assert(memberALoginAgain);

  const allowedBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberA.id,
        body: allowedBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription must belong to member A",
    subscription.member_user_id,
    memberA.id,
  );

  TestValidator.equals(
    "subscription must target the created community",
    subscription.community_id,
    community.id,
  );
}
