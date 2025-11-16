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
 * Validate that platform-admin subscription GET reflects latest admin updates.
 *
 * Business context: Platform administrators must be able to inspect community
 * subscription records in a way that always reflects the latest persisted
 * state, even when updates are performed via privileged admin endpoints. This
 * test ensures that the admin-facing GET endpoint returns a subscription whose
 * mutable fields (such as status and updated_at) track the most recent update
 * operation, while immutable linkage fields (id, member_user_id, community_id)
 * remain stable.
 *
 * Scenario steps:
 *
 * 1. Join as platformAdmin (auto-login) so that platform-admin-only endpoints can
 *    be used later.
 * 2. Create a community visibility level via the platformAdmin API; this will be
 *    referenced when creating the community.
 * 3. Join as memberUser (auto-login) to obtain a member actor.
 * 4. As memberUser, create a community that references the created visibility
 *    level code.
 * 5. As memberUser, create a subscription for that community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions with
 *    an initial status (e.g., "pending"). Capture the initial subscription
 *    including id, member_user_id, community_id, status, created_at and
 *    updated_at.
 * 6. Switch back to platformAdmin context via /auth/platformAdmin/login so that
 *    admin-level subscription update endpoints can be invoked.
 * 7. As platformAdmin, call PUT
 *    /communityPlatform/platformAdmin/communities/{communityId}/subscriptions/{subscriptionId}
 *    with an ICommunityPlatformCommunitySubscription.IUpdate body that changes
 *    the status to a new value (e.g., "active"). Capture the updated
 *    subscription returned from the PUT.
 * 8. Immediately call the platformAdmin GET endpoint for the same
 *    communityId/subscriptionId and validate that:
 *
 *    - The returned subscription is type-correct (typia.assert).
 *    - Status equals the value sent in the latest update body.
 *    - Id, member_user_id, and community_id are identical to the original
 *         subscription.
 *    - Updated_at is not earlier than the updated_at from the PUT response (ideally
 *         greater than the original created_at/updated_at), proving that a
 *         newer snapshot is being read.
 * 9. Optionally perform a second update with another valid status value and re-run
 *    the GET to ensure read-after-write consistency across multiple updates,
 *    always checking that immutable identifiers remain stable while updated_at
 *    keeps advancing and status reflects the last change.
 */
export async function test_api_platform_admin_get_subscription_reflects_latest_updates(
  connection: api.IConnection,
) {
  // 1. Join as platformAdmin (auto-login)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level as platformAdmin
  const visibilityCreateBody = {
    code: `vl_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Join as memberUser (auto-login)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community that uses the created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. As memberUser, create a subscription for that community
  const initialStatusOptions = ["pending", "active", "rejected"] as const;
  const initialStatus = RandomGenerator.pick(initialStatusOptions);
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

  // Capture initial immutable and timestamp fields
  const originalId = createdSubscription.id;
  const originalMemberUserId = createdSubscription.member_user_id;
  const originalCommunityId = createdSubscription.community_id;
  const originalCreatedAt = createdSubscription.created_at;
  const originalUpdatedAt = createdSubscription.updated_at;

  // 6. Switch back to platformAdmin context via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // 7. First admin update: change status
  const nextStatusOptions = ["pending", "active", "rejected"] as const;
  const firstUpdateStatus = RandomGenerator.pick(nextStatusOptions);
  const firstUpdateBody = {
    status: firstUpdateStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;
  const updatedByPut1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedByPut1);

  // 8. GET after first update and validations
  const readAfterFirstUpdate: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(readAfterFirstUpdate);

  TestValidator.equals(
    "GET after first update should reflect updated status",
    readAfterFirstUpdate.status,
    firstUpdateStatus,
  );
  TestValidator.equals(
    "id must remain unchanged after update",
    readAfterFirstUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "member_user_id must remain unchanged after update",
    readAfterFirstUpdate.member_user_id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "community_id must remain unchanged after update",
    readAfterFirstUpdate.community_id,
    originalCommunityId,
  );

  // Timestamp progression checks (string comparison via Date parsing)
  const originalCreatedAtDate = new Date(originalCreatedAt).getTime();
  const originalUpdatedAtDate = new Date(originalUpdatedAt).getTime();
  const putUpdatedAtDate = new Date(updatedByPut1.updated_at).getTime();
  const getUpdatedAtDate = new Date(readAfterFirstUpdate.updated_at).getTime();

  TestValidator.predicate(
    "updated_at after PUT should be >= original updated_at",
    putUpdatedAtDate >= originalUpdatedAtDate,
  );
  TestValidator.predicate(
    "updated_at after PUT should be >= created_at",
    putUpdatedAtDate >= originalCreatedAtDate,
  );
  TestValidator.predicate(
    "updated_at returned by GET should be >= PUT updated_at",
    getUpdatedAtDate >= putUpdatedAtDate,
  );

  // 9. Second update with another status to prove read-after-write consistency
  const secondStatusCandidates = nextStatusOptions.filter(
    (s) => s !== firstUpdateStatus,
  );
  const secondUpdateStatus =
    secondStatusCandidates.length > 0
      ? RandomGenerator.pick(secondStatusCandidates)
      : firstUpdateStatus;

  const secondUpdateBody = {
    status: secondUpdateStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedByPut2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedByPut2);

  const readAfterSecondUpdate: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(readAfterSecondUpdate);

  TestValidator.equals(
    "GET after second update should reflect most recent status",
    readAfterSecondUpdate.status,
    secondUpdateStatus,
  );
  TestValidator.equals(
    "id must remain unchanged after second update",
    readAfterSecondUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "member_user_id must remain unchanged after second update",
    readAfterSecondUpdate.member_user_id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "community_id must remain unchanged after second update",
    readAfterSecondUpdate.community_id,
    originalCommunityId,
  );

  const put2UpdatedAtDate = new Date(updatedByPut2.updated_at).getTime();
  const get2UpdatedAtDate = new Date(
    readAfterSecondUpdate.updated_at,
  ).getTime();

  TestValidator.predicate(
    "updated_at after second PUT should be >= first PUT updated_at",
    put2UpdatedAtDate >= putUpdatedAtDate,
  );
  TestValidator.predicate(
    "updated_at after second GET should be >= second PUT updated_at",
    get2UpdatedAtDate >= put2UpdatedAtDate,
  );
}
