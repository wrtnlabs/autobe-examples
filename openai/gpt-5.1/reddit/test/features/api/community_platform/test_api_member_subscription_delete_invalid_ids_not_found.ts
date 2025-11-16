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
 * Validate that deleting a subscription with a subscriptionId that does not
 * belong to the specified community yields a not-found style error while
 * leaving valid subscriptions intact.
 *
 * Business context: A community subscription is uniquely associated with a
 * specific community and member user. Deletion via DELETE
 * /communityPlatform/memberUser/communities/{communityId}/subscriptions/{subscriptionId}
 * must enforce that the subscription being removed belongs to the given
 * community. If the subscriptionId is valid but belongs to another community,
 * or is entirely unknown, the operation should behave as a not-found error in
 * the context of that community.
 *
 * Test steps:
 *
 * 1. Register and implicitly authenticate a member user (memberUser actor) using
 *    /auth/memberUser/join.
 * 2. Register and implicitly authenticate a platform admin (platformAdmin actor)
 *    using /auth/platformAdmin/join so that community visibility levels can be
 *    created.
 * 3. As platformAdmin, create a visibility level using
 *    /communityPlatform/platformAdmin/communityVisibilityLevels with a random
 *    code and name.
 * 4. Switch authentication back to the memberUser using /auth/memberUser/login so
 *    subsequent community and subscription operations run under the memberUser
 *    actor.
 * 5. Create a first community with the created visibilityLevelCode using
 *    /communityPlatform/memberUser/communities, capturing its communityId.
 * 6. Create a subscription in the first community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions,
 *    capturing subscriptionId_A.
 * 7. Create a second community (also referencing the existing visibility level)
 *    and then create a subscription in that second community, capturing
 *    subscriptionId_B.
 * 8. Attempt to delete using the mismatched pair (communityId = first community's
 *    id, subscriptionId = subscriptionId_B from the second community) by
 *    calling the erase SDK function. Wrap this call in TestValidator.httpError
 *    and assert that it returns a 404-style error, confirming that
 *    subscriptions are scoped by community.
 * 9. After the failed deletion attempt, delete the valid subscription
 *    subscriptionId_A from the first community using the correct pair
 *    (communityId of first community + subscriptionId_A) and assert that this
 *    call succeeds (no error thrown). This demonstrates that the previous
 *    mismatched delete did not accidentally remove or corrupt the valid
 *    subscription.
 *
 * Validation focus:
 *
 * - The DELETE call with mismatched communityId/subscriptionId must respond with
 *   a not-found (404-style) error.
 * - A subsequent DELETE call with the correct communityId/subscriptionId pair
 *   must succeed, proving that the valid subscription remained after the failed
 *   attempt.
 */
export async function test_api_member_subscription_delete_invalid_ids_not_found(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate a member user
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Register and implicitly authenticate a platform admin
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateInput = {
    code: visibilityCode,
    name: "Public visible community",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateInput },
    );
  typia.assert(visibility);

  // 4. Switch back to memberUser using login
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoggedIn);

  // 5. Create first community
  const communityCreateInputA = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateInputA },
    );
  typia.assert(communityA);

  // 6. Create subscription in first community
  const subscriptionCreateInputA = {
    community_id: communityA.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityA.id,
        body: subscriptionCreateInputA,
      },
    );
  typia.assert(subscriptionA);

  // 7. Create second community and its subscription
  const communityCreateInputB = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateInputB },
    );
  typia.assert(communityB);

  const subscriptionCreateInputB = {
    community_id: communityB.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityB.id,
        body: subscriptionCreateInputB,
      },
    );
  typia.assert(subscriptionB);

  // 8. Attempt to delete using mismatched pair (communityA.id, subscriptionB.id)
  await TestValidator.httpError(
    "deleting subscription with mismatched communityId and subscriptionId should return 404-style error",
    404,
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscriptions.erase(
        connection,
        {
          communityId: communityA.id,
          subscriptionId: subscriptionB.id,
        },
      );
    },
  );

  // 9. Delete the valid subscription in first community with correct pair
  await api.functional.communityPlatform.memberUser.communities.subscriptions.erase(
    connection,
    {
      communityId: communityA.id,
      subscriptionId: subscriptionA.id,
    },
  );
}
