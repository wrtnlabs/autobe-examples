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
 * Ensure community moderators cannot access subscription details for
 * communities they do not moderate.
 *
 * Business context: Community moderators should only be able to introspect
 * subscription relationships for communities within their moderation scope.
 * This test builds a subscription owned by member user A in community C1, then
 * authenticates as a separate community moderator M1 who is not attached to C1
 * and verifies that attempting to fetch the subscription via the moderator
 * detail endpoint does not succeed as a normal happy-path subscription read.
 *
 * Workflow steps:
 *
 * 1. Create member user A via /auth/memberUser/join.
 * 2. Create platform admin via /auth/platformAdmin/join and login as
 *    platformAdmin.
 * 3. As platformAdmin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Login as member user A via /auth/memberUser/login.
 * 5. As member user A, create community C1 via
 *    /communityPlatform/memberUser/communities using the visibility level
 *    code.
 * 6. As member user A, create a subscription to C1 via
 *    /communityPlatform/memberUser/subscriptions and capture subscriptionId.
 * 7. Independently register community moderator M1 via
 *    /auth/communityModerator/join.
 * 8. Login as community moderator M1 via /auth/communityModerator/login.
 * 9. As moderator M1, call
 *    /communityPlatform/communityModerator/subscriptions/{subscriptionId} with
 *    subscriptionId from step 6 and assert that this call does not succeed as a
 *    normal ICommunityPlatformCommunitySubscription response by wrapping it in
 *    TestValidator.error.
 */
export async function test_api_moderator_subscription_detail_forbidden_unrelated_community(
  connection: api.IConnection,
) {
  // 1. Register member user A (subscriber and community creator)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberA);

  // 2. Register platform admin and login
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoggedIn,
  );

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility Level",
    description: "Visibility level used for community C1 in tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Login as member user A
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALoggedIn);

  // 5. As member user A, create community C1 using the created visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Community C1",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibilityLevelCode: visibilityCreateBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityC1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityC1);

  // 6. As member user A, subscribe to community C1 and capture subscription id
  const subscriptionCreateBody = {
    community_id: communityC1.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionC1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscriptionC1);

  // Sanity check that the subscription is owned by member user A and bound to C1
  TestValidator.equals(
    "subscription belongs to created community C1",
    subscriptionC1.community.id,
    communityC1.id,
  );

  // 7. Register community moderator M1 (not linked to community C1 in any way)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorM1: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorM1);

  // 8. Login as community moderator M1
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorM1LoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorM1LoggedIn,
  );

  // 9. As moderator M1, attempt to fetch member A's subscription to C1.
  // We expect backend authorization to prevent this from succeeding as a
  // normal subscription read for an unrelated moderator, so we assert that
  // calling the endpoint results in an error (e.g., HttpError 403/404).
  await TestValidator.error(
    "unrelated moderator must not be able to read member subscription details",
    async () => {
      const result: ICommunityPlatformCommunitySubscription =
        await api.functional.communityPlatform.communityModerator.subscriptions.at(
          connection,
          {
            subscriptionId: subscriptionC1.id,
          },
        );

      // If we reach here, no error was thrown, so fail the test explicitly to
      // satisfy the TestValidator.error contract and report broken
      // authorization.
      typia.assert<ICommunityPlatformCommunitySubscription>(result);
      throw new Error(
        "Moderator M1 unexpectedly succeeded in reading unrelated subscription details.",
      );
    },
  );
}
