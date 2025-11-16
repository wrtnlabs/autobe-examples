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
 * Verify access control for member-user community subscriptions.
 *
 * This scenario ensures that POST
 * /communityPlatform/memberUser/communities/{communityId}/subscriptions
 * strictly requires an authenticated memberUser context and that the same
 * syntactically valid subscription payload behaves differently depending on
 * authentication.
 *
 * Business flow:
 *
 * 1. Platform admin joins and is issued tokens.
 * 2. Platform admin creates a community visibility level.
 * 3. Member user joins and is issued tokens.
 * 4. Member user creates a community using the created visibility level.
 * 5. Build a valid ICommunityPlatformCommunitySubscription.ICreate payload
 *    targeting that community.
 * 6. Attempt to create the subscription with an unauthenticated connection (no
 *    Authorization header) and assert that an error occurs.
 * 7. Create the subscription again using the authenticated member user connection
 *    and assert success and basic field correctness.
 */
export async function test_api_memberuser_community_subscription_access_control(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap: join as a new platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public_auto_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Member user bootstrap: join as a new member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as the authenticated member user
  const communityIdentifier = `auto_${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Prepare a valid subscription payload for this community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  // 6. Unauthenticated subscription attempt: clone connection with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated subscription creation must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
        unauthConnection,
        {
          communityId: community.id,
          body: subscriptionCreateBody,
        },
      );
    },
  );

  // 7. Authenticated subscription attempt with member user connection
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 8. Behavioral assertions
  TestValidator.equals(
    "subscription community_id should match target community id",
    subscription.community_id,
    community.id,
  );

  TestValidator.equals(
    "subscription status should reflect requested status",
    subscription.status,
    subscriptionCreateBody.status,
  );

  TestValidator.predicate(
    "subscription should belong to some member user (member_user_id non-empty)",
    subscription.member_user_id.length > 0,
  );

  TestValidator.equals(
    "subscription's community summary id should match community id",
    subscription.community.id,
    community.id,
  );
}
