import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * E2E: platform admin updates a community subscription's status and preserves
 * immutable linkage.
 *
 * Business goal
 *
 * - Ensure that a platform administrator can change the status of an existing
 *   community subscription and that this change is reflected in the returned
 *   record without altering immutable linkage fields (id, member_user_id,
 *   community_id).
 *
 * End-to-end steps
 *
 * 1. Register a platform administrator (platformAdmin.join) to obtain an
 *    authorized admin context.
 * 2. Register a member user (memberUser.join) who will own community and
 *    subscription.
 * 3. Switch to platformAdmin and create a visibility level master record.
 * 4. Switch to memberUser and create a community using the created visibility
 *    level's code.
 * 5. Switch back to platformAdmin and create a community membership for the member
 *    user in the created community.
 * 6. Switch to memberUser and create a subscription for that community with an
 *    initial status (e.g., "pending").
 * 7. Capture immutable identifiers and timestamps from the created subscription.
 * 8. Switch back to platformAdmin and call the update endpoint to change status to
 *    "active".
 * 9. Assert that:
 *
 *    - Id, member_user_id, and community_id stay the same.
 *    - Status has changed from the original value to the new one.
 *    - Updated_at has advanced compared to the original updated_at and is not
 *         earlier than created_at.
 */
export async function test_api_platform_admin_updates_subscription_status_successfully(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (and implicitly authenticate).
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.test.com/register",
    referrer: "https://admin.test.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Persist platform admin login identifier for later re-login.
  const platformAdminIdentifier: string = platformAdminJoinBody.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 2. Register a member user (and implicitly authenticate as that member).
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "MemberPassword123!",
    ip: "127.0.0.1",
    href: "https://member.test.com/register" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberIdentifier: string = memberJoinBody.email;
  const memberPassword: string = memberJoinBody.password;

  // 3. Switch to platform admin again (since the connection now carries member token).
  const platformAdminLoginBody = {
    identifier: platformAdminIdentifier,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3-1. Create a visibility level master record.
  const visibilityCreateBody = {
    code: `vis_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
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

  // 4. Switch to member user and create a community using the visibility level code.
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://member.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 5. Switch back to platform admin to create a membership for the member user.
  const platformAdminLoginAgainBody = {
    identifier: platformAdminIdentifier,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginAgainBody,
    });
  typia.assert(platformAdminLoginAgain);

  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Sanity check: membership's community and memberuser match expectations.
  TestValidator.equals(
    "membership community id matches community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id matches member user",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  // 6. Switch to member user again and create a subscription for the community.
  const memberLoginAgainBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://member.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginAgainBody,
    });
  typia.assert(memberLoginAgain);

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

  // Capture immutable identifiers and original timestamps.
  const originalId = createdSubscription.id;
  const originalMemberUserId = createdSubscription.member_user_id;
  const originalCommunityId = createdSubscription.community_id;
  const originalStatus = createdSubscription.status;
  const originalCreatedAt = createdSubscription.created_at;
  const originalUpdatedAt = createdSubscription.updated_at;

  // 7. Switch back to platform admin and update the subscription status.
  const platformAdminLoginForUpdateBody = {
    identifier: platformAdminIdentifier,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoginForUpdate: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginForUpdateBody,
    });
  typia.assert(platformAdminLoginForUpdate);

  const newStatus = originalStatus === "active" ? "pending" : "active";
  const subscriptionUpdateBody = {
    status: newStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;
  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
        body: subscriptionUpdateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 8. Assertions: immutable fields unchanged.
  TestValidator.equals(
    "subscription id remains unchanged after update",
    updatedSubscription.id,
    originalId,
  );
  TestValidator.equals(
    "subscription member_user_id remains unchanged after update",
    updatedSubscription.member_user_id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "subscription community_id remains unchanged after update",
    updatedSubscription.community_id,
    originalCommunityId,
  );

  // 9. Assert status actually changed to the new value.
  TestValidator.equals(
    "subscription status is updated to new value",
    updatedSubscription.status,
    newStatus,
  );
  TestValidator.notEquals(
    "subscription status differs from original",
    updatedSubscription.status,
    originalStatus,
  );

  // 10. Timestamp invariants.
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(updatedSubscription.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at changed compared to original updated_at",
    updatedSubscription.updated_at !== originalUpdatedAt,
  );

  // 11. Association sanity checks remain coherent.
  TestValidator.equals(
    "embedded memberUser id matches linkage field",
    updatedSubscription.memberUser.id,
    updatedSubscription.member_user_id,
  );
  TestValidator.equals(
    "embedded community id matches linkage field",
    updatedSubscription.community.id,
    updatedSubscription.community_id,
  );
}
