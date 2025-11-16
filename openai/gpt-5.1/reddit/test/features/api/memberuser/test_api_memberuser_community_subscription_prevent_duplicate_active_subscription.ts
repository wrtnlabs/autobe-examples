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
 * Validate that a member user cannot create multiple active subscriptions to
 * the same community.
 *
 * Business flow:
 *
 * 1. Platform admin joins to obtain admin context.
 * 2. Platform admin creates a visibility level that communities can reference.
 * 3. Member user joins to obtain member context.
 * 4. Member user creates a community using the created visibility level code.
 * 5. Member user subscribes to that community once (S1) successfully.
 * 6. Member user attempts to subscribe to the same community again (S2).
 * 7. Second subscription creation must fail according to uniqueness rules, and
 *    existing subscription S1 must remain unchanged in memory.
 */
export async function test_api_memberuser_community_subscription_prevent_duplicate_active_subscription(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registration + initial tokens)
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
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
    "visibility level code must match creation request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (registration + initial tokens)
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community using the visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches creation request",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code matches",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Member user creates first subscription (S1)
  const subscriptionCreateBody: ICommunityPlatformCommunitySubscription.ICreate =
    {
      community_id: community.id,
      status: "active",
    };

  const subscription1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription1);

  TestValidator.equals(
    "first subscription community_id must equal community id",
    subscription1.community_id,
    community.id,
  );
  TestValidator.equals(
    "first subscription member user id must equal authorized member id",
    subscription1.member_user_id,
    memberAuthorized.id,
  );

  const originalStatus = subscription1.status;
  const originalId = subscription1.id;

  // 6. Attempt to create a second subscription (S2) for same member-community pair
  const duplicateSubscriptionBody: ICommunityPlatformCommunitySubscription.ICreate =
    {
      community_id: community.id,
      status: "active",
    };

  await TestValidator.error(
    "duplicate active subscription creation must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
        connection,
        {
          communityId: community.id,
          body: duplicateSubscriptionBody,
        },
      );
    },
  );

  // 7. Confirm in-memory S1 has not changed
  TestValidator.equals(
    "original subscription id should remain unchanged after duplicate attempt",
    subscription1.id,
    originalId,
  );
  TestValidator.equals(
    "original subscription status should remain unchanged after duplicate attempt",
    subscription1.status,
    originalStatus,
  );
}
