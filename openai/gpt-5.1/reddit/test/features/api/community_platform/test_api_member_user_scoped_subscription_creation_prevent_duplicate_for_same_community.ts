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
 * Ensure that member-user-scoped subscription creation prevents duplicate
 * active subscriptions for the same community.
 *
 * Business flow:
 *
 * 1. Register a member user (auth/memberUser/join) – captures member user id and
 *    establishes memberUser auth.
 * 2. Register a platform admin (auth/platformAdmin/join) – switches connection
 *    auth to platformAdmin.
 * 3. As platformAdmin, create a visibility level
 *    (communityPlatform/platformAdmin/communityVisibilityLevels).
 * 4. Switch auth back to the member user via auth/memberUser/login.
 * 5. As member user, create a community using the created visibility level.
 * 6. As member user, create a subscription for that community at
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * 7. Attempt to create a second subscription for the same memberUserId and
 *    community_id.
 * 8. Assert that the second creation attempt fails (business rule: uniqueness of
 *    active subscriptions).
 */
export async function test_api_member_user_scoped_subscription_creation_prevent_duplicate_for_same_community(
  connection: api.IConnection,
) {
  // 1. Register a member user via /auth/memberUser/join
  const memberJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinHref: string & tags.Format<"uri"> =
    "https://example.com/join" as string & tags.Format<"uri">;
  const memberJoinReferrer: string & tags.Format<"uri"> =
    "https://example.com/landing" as string & tags.Format<"uri">;

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberJoinEmail,
    password: "Password123!",
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register a platform admin via /auth/platformAdmin/join
  const adminJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinHref: string & tags.Format<"uri"> =
    "https://example.com/admin/join" as string & tags.Format<"uri">;
  const adminJoinReferrer: string & tags.Format<"uri"> =
    "https://example.com/admin/landing" as string & tags.Format<"uri">;

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminJoinEmail,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create a visibility level
  const visibilityCodeBase = RandomGenerator.alphabets(8);
  const visibilityLevelBody = {
    code: visibilityCodeBase,
    name: `Visibility ${visibilityCodeBase}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch auth back to the member user via /auth/memberUser/login
  const memberLoginHref: string & tags.Format<"uri"> =
    "https://example.com/login" as string & tags.Format<"uri">;
  const memberLoginReferrer: string & tags.Format<"uri"> =
    "https://example.com/landing/login" as string & tags.Format<"uri">;

  const memberLoginBody = {
    identifier: memberJoinEmail,
    password: "Password123!",
    ip: null,
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAgain);

  TestValidator.equals(
    "member user id remains consistent after login",
    memberAuthorizedAgain.id,
    memberUserId,
  );

  // 5. As member user, create a community
  const communityIdentifier = RandomGenerator.alphabets(10);
  const communityTitle = RandomGenerator.paragraph({ sentences: 2 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
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

  // 6. Create the first subscription for that community
  const firstSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const firstSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: firstSubscriptionBody,
      },
    );
  typia.assert(firstSubscription);

  TestValidator.equals(
    "first subscription member_user_id matches member user id",
    firstSubscription.member_user_id,
    memberUserId,
  );

  TestValidator.equals(
    "first subscription community_id matches created community id",
    firstSubscription.community_id,
    community.id,
  );

  // 7. Attempt to create a second subscription for the same member user and community
  const duplicateSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  await TestValidator.error(
    "duplicate subscription creation should fail for same member user and community",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
        connection,
        {
          memberUserId,
          body: duplicateSubscriptionBody,
        },
      );
    },
  );
}
