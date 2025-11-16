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
 * Validate moderator rejection of a member user's community subscription
 * request.
 *
 * Business goal
 *
 * - Ensure that a community moderator can transition a community subscription's
 *   status from `pending` to `rejected` using the moderator subscription update
 *   endpoint.
 * - Ensure that immutable identity fields of the subscription (member_user_id and
 *   community_id) remain unchanged after the moderator update.
 *
 * High-level workflow
 *
 * 1. Register a platform admin and let the SDK attach its Authorization token.
 * 2. As platform admin, create a visibility level that will be referenced by
 *    communities.
 * 3. Register a member user; the connection Authorization becomes the member user.
 * 4. As the member user, create a community using the created visibility level
 *    code.
 * 5. As the member user, create a subscription to that community with a `pending`
 *    status.
 * 6. Register a community moderator; the Authorization switches to moderator.
 * 7. As the moderator, update the subscription status to `rejected` via the
 *    moderator endpoint.
 * 8. Assert that:
 *
 *    - The subscription status is `rejected` after the update.
 *    - The member_user_id and community_id on the subscription have not changed.
 *
 * Validation strategy
 *
 * - Use typia.assert() on each non-void API response to enforce structural and
 *   type correctness.
 * - Use TestValidator.equals() with descriptive titles to validate business
 *   invariants:
 *
 *   - Status transitions from `pending` to `rejected`.
 *   - Member_user_id and community_id remain equal to their original values.
 */
export async function test_api_moderator_rejects_member_subscription_request(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain admin context for visibility level creation.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a visibility level for communities.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: "Publicly visible community for general discussion.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user, switching Authorization to memberUser context.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. As the member user, create a community referencing the created visibility level code.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. As the member user, subscribe to the community with status `pending`.
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const pendingSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(pendingSubscription);

  TestValidator.equals(
    "subscription should initially be pending",
    pendingSubscription.status,
    "pending",
  );
  TestValidator.equals(
    "subscription member_user_id should equal authorized member user's id",
    pendingSubscription.member_user_id,
    memberUser.id,
  );
  TestValidator.equals(
    "subscription community_id should equal created community id",
    pendingSubscription.community_id,
    community.id,
  );

  const originalMemberUserId = pendingSubscription.member_user_id;
  const originalCommunityId = pendingSubscription.community_id;

  // 6. Register a community moderator, switching Authorization to moderator context.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 7. As the community moderator, update the subscription status to `rejected`.
  const updateBody = {
    status: "rejected",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const rejectedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.communityModerator.subscriptions.update(
      connection,
      {
        subscriptionId: pendingSubscription.id,
        body: updateBody,
      },
    );
  typia.assert(rejectedSubscription);

  // 8. Assertions on the updated subscription.
  TestValidator.equals(
    "subscription status should transition to rejected",
    rejectedSubscription.status,
    "rejected",
  );
  TestValidator.notEquals(
    "subscription status should no longer be pending",
    rejectedSubscription.status,
    "pending",
  );
  TestValidator.equals(
    "subscription member_user_id must remain unchanged after moderator update",
    rejectedSubscription.member_user_id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "subscription community_id must remain unchanged after moderator update",
    rejectedSubscription.community_id,
    originalCommunityId,
  );
}
