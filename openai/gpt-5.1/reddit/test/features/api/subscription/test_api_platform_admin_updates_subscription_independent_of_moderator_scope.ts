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
 * Validate that a platform administrator can override a community
 * subscription’s status regardless of the original actor (member user) that
 * created it.
 *
 * Business intent (adapted to available APIs):
 *
 * - A member user creates a community and subscribes to it, establishing a
 *   subscription record with some initial status (e.g., "pending" or
 *   "active").
 * - A platform administrator, operating with global authority, later updates that
 *   subscription via the platformAdmin subscriptions endpoint and changes the
 *   status to a different value (e.g., "rejected").
 * - The update must preserve all linkage fields (member_user_id, community_id,
 *   and associated summary objects) while only changing the status field,
 *   demonstrating that the admin’s override does not corrupt ownership
 *   relationships.
 *
 * Steps:
 *
 * 1. Register a platform admin using /auth/platformAdmin/join.
 * 2. As platform admin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user via /auth/memberUser/join.
 * 4. (Optionally) Re-login as member user via /auth/memberUser/login to confirm
 *    actor switching and token handling.
 * 5. As member user, create a community via
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level’s code.
 * 6. As member user, create a subscription for that community via
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions with
 *    an initial status.
 * 7. Switch back to platform admin context via /auth/platformAdmin/login.
 * 8. As platform admin, update the subscription via
 *    /communityPlatform/platformAdmin/subscriptions/{subscriptionId}, setting a
 *    new status (different from the original).
 * 9. Assert that:
 *
 *    - The subscription after creation has the original status.
 *    - The subscription after admin update has the new status.
 *    - Member_user_id, community_id, and nested memberUser/community summary IDs
 *         remain unchanged between the two responses.
 */
export async function test_api_platform_admin_updates_subscription_independent_of_moderator_scope(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join implicitly authenticates and sets Authorization header)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a community visibility level
  const visibilityCode: string = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (join -> auto-login as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: RandomGenerator.alphabets(8),
    href: "https://member.join.example.com/",
    referrer: "https://campaign.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Re-login as member user (explicit login to exercise actor switch)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);
  TestValidator.equals(
    "member login should refer to same member id as join",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 5. As member user, create a community referencing the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
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
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 6. As member user, create a subscription to this community
  const initialStatus = "pending";
  const subscriptionCreateBody = {
    community_id: community.id,
    status: initialStatus,
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
    "created subscription status should match initial status",
    createdSubscription.status,
    initialStatus,
  );
  TestValidator.equals(
    "created subscription member_user_id should match member id",
    createdSubscription.member_user_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created subscription community_id should match community id",
    createdSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "created subscription nested memberUser summary id should match member id",
    createdSubscription.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created subscription nested community summary id should match community id",
    createdSubscription.community.id,
    community.id,
  );

  // 7. Switch back to platform admin context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip ?? null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);
  TestValidator.equals(
    "platform admin login should refer to same admin id as join",
    platformAdminLoginAuthorized.id,
    platformAdminAuthorized.id,
  );

  // 8. As platform admin, override subscription status
  const overriddenStatus = initialStatus === "pending" ? "rejected" : "pending";
  const subscriptionUpdateBody = {
    status: overriddenStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.update(
      connection,
      {
        subscriptionId: createdSubscription.id,
        body: subscriptionUpdateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 9. Assertions: status overridden, linkages preserved
  TestValidator.equals(
    "updated subscription should reflect overridden status from platform admin",
    updatedSubscription.status,
    overriddenStatus,
  );
  TestValidator.equals(
    "subscription member_user_id should remain unchanged after admin override",
    updatedSubscription.member_user_id,
    createdSubscription.member_user_id,
  );
  TestValidator.equals(
    "subscription community_id should remain unchanged after admin override",
    updatedSubscription.community_id,
    createdSubscription.community_id,
  );
  TestValidator.equals(
    "nested memberUser summary id should remain unchanged after admin override",
    updatedSubscription.memberUser.id,
    createdSubscription.memberUser.id,
  );
  TestValidator.equals(
    "nested community summary id should remain unchanged after admin override",
    updatedSubscription.community.id,
    createdSubscription.community.id,
  );
}
