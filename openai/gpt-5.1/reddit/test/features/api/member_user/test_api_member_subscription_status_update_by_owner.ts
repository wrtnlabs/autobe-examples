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
 * Validate that a member user can update the mutable status field of their own
 * community subscription identified by subscriptionId, while immutable linkage
 * fields remain unchanged.
 *
 * Business flow:
 *
 * 1. Register a member user via POST /auth/memberUser/join and treat its resulting
 *    authenticated context as the owner of subsequent memberUser operations.
 * 2. Register a platform admin via POST /auth/platformAdmin/join and use that
 *    admin context to create a visibility level master record via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Switch back to the member user actor (via POST /auth/memberUser/login) and
 *    create a community via POST /communityPlatform/memberUser/communities
 *    referencing the created visibilityLevelCode.
 * 4. With the member user still authenticated, create a subscription for that
 *    community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions,
 *    capturing the subscription id and original status.
 * 5. Call PUT /communityPlatform/memberUser/subscriptions/{subscriptionId} with an
 *    ICommunityPlatformCommunitySubscription.IUpdate payload that changes the
 *    status to a new value.
 * 6. Assert that the PUT response returns an
 *    ICommunityPlatformCommunitySubscription, that the status has changed to
 *    the new value, and that member_user_id and community_id match the
 *    previously created subscription.
 */
export async function test_api_member_subscription_status_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register member user (join) to obtain an authenticated memberUser actor.
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // Preserve the member user id for later ownership checks.
  const memberUserId = memberAuthorized.id;

  // 2. Register platform admin and get platformAdmin context.
  const platformAdminJoinInput = {
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
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As platform admin, create a visibility level master record.
  const visibilityCode = `code-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateInput = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateInput },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to the member user actor by logging in.
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/joinComplete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberAuthorizedAfterLogin);

  TestValidator.equals(
    "member id from login should equal original join id",
    memberAuthorizedAfterLogin.id,
    memberUserId,
  );

  // 5. Create a community as the authenticated member user.
  const communityCreateInput = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateInput },
    );
  typia.assert(community);

  const communityId = community.id;

  // 6. Create an initial subscription for that community as the member user.
  const subscriptionCreateInput = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId,
        body: subscriptionCreateInput,
      },
    );
  typia.assert(createdSubscription);

  // Capture original immutable linkage and status for comparison.
  const originalMemberUserId = createdSubscription.member_user_id;
  const originalCommunityId = createdSubscription.community_id;
  const originalStatus = createdSubscription.status;

  // Sanity-check ownership and linkage: subscription must belong to the logged-in memberUser and target community.
  TestValidator.equals(
    "subscription.member_user_id must equal authenticated member user id",
    originalMemberUserId,
    memberUserId,
  );
  TestValidator.equals(
    "subscription.community_id must equal created community id",
    originalCommunityId,
    communityId,
  );

  // 7. Update the subscription status via PUT /communityPlatform/memberUser/subscriptions/{subscriptionId}.
  const newStatus = originalStatus === "active" ? "pending" : "active";
  const updateInput = {
    status: newStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.update(
      connection,
      {
        subscriptionId: createdSubscription.id,
        body: updateInput,
      },
    );
  typia.assert(updatedSubscription);

  // 8. Assert that status changed and immutable fields remain unchanged.
  TestValidator.equals(
    "updated subscription should preserve member_user_id",
    updatedSubscription.member_user_id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "updated subscription should preserve community_id",
    updatedSubscription.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "updated subscription should have new status",
    updatedSubscription.status,
    newStatus,
  );

  TestValidator.notEquals(
    "status should actually change from original",
    updatedSubscription.status,
    originalStatus,
  );
}
