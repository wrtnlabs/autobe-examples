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
 * Verify that a non-owner member user cannot delete another member's community
 * subscription.
 *
 * Business scenario:
 *
 * - Member A creates a community and subscribes to it.
 * - Member B (a different member user) attempts to delete Member A's subscription
 *   using the memberUser-scoped DELETE endpoint.
 * - The system must enforce ownership-based access control so that Member B
 *   cannot delete Member A's subscription, while the owner (Member A) can
 *   delete it.
 *
 * Test flow:
 *
 * 1. Join Member A (auth.memberUser.join) with a known email/password, and keep
 *    those credentials for later login.
 * 2. Join Platform Admin (auth.platformAdmin.join) so we can create a community
 *    visibility level as a platformAdmin actor.
 * 3. As Platform Admin, create a visibility level using
 *    communityPlatform.platformAdmin.communityVisibilityLevels.create, and
 *    capture its `code`.
 * 4. Log in as Member A (auth.memberUser.login) with the stored credentials to
 *    ensure the memberUser context is active.
 * 5. As Member A, create a community via
 *    communityPlatform.memberUser.communities.create, using the
 *    visibilityLevelCode from step 3; capture `community.id`.
 * 6. As Member A, create a subscription for that community via
 *    communityPlatform.memberUser.communities.subscriptions.create, passing
 *    `communityId` from step 5 and a body whose `community_id` matches that
 *    same id; capture `subscription.id`.
 * 7. Join Member B (auth.memberUser.join) so that the connection now holds Member
 *    B's access token.
 * 8. While authenticated as Member B, attempt to delete Member A's subscription by
 *    calling communityPlatform.memberUser.communities.subscriptions.erase with
 *    the same `communityId` and `subscriptionId`.
 * 9. Assert that this DELETE call fails by wrapping it in TestValidator.error with
 *    an async closure (we only assert that an error occurs, not the exact HTTP
 *    status code).
 * 10. Log back in as Member A using the stored credentials and call the same DELETE
 *     endpoint for the same subscription; this call is expected to succeed,
 *     proving that the subscription still existed after Member B's forbidden
 *     attempt and that owner deletion is allowed.
 */
export async function test_api_member_subscription_delete_wrong_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Join Member A with known credentials
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberAEmail = typia.random<string & tags.Format<"email">>();

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://member-a.example.com/join",
      referrer: "https://member-a.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  // 2. Join Platform Admin (this call overwrites connection.headers.Authorization)
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(2),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 3. As Platform Admin, create a visibility level and capture its `code`
  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // 4. Log in as Member A to restore memberUser context
  const memberALogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://member-a.example.com/login",
      referrer: "https://member-a.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALogin);

  // 5. As Member A, create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. As Member A, create a subscription for that community
  const subscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 7. Join Member B (becomes current auth actor)
  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://member-b.example.com/join",
      referrer: "https://member-b.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);

  // 8-9. Member B attempts to delete Member A's subscription and must fail
  await TestValidator.error(
    "non-owner member user cannot delete another member's subscription",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscriptions.erase(
        connection,
        {
          communityId: community.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // 10. Log back in as Member A and delete the subscription successfully
  const memberALoginAgain = await api.functional.auth.memberUser.login(
    connection,
    {
      body: {
        identifier: memberAEmail,
        password: memberAPassword,
        ip: null,
        href: "https://member-a.example.com/login",
        referrer: "https://member-a.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALoginAgain);

  await api.functional.communityPlatform.memberUser.communities.subscriptions.erase(
    connection,
    {
      communityId: community.id,
      subscriptionId: subscription.id,
    },
  );
}
