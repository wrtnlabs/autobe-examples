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
 * Validate happy-path creation of a memberUser-scoped community subscription.
 *
 * Business goals:
 *
 * - Ensure an authenticated member user can subscribe to a community they own.
 * - Ensure the scoped endpoint correctly binds the subscription to the
 *   memberUserId path parameter, ignoring any spoofing possibilities from
 *   request body.
 * - Verify that base subscription logic used by the generic subscription endpoint
 *   is compatible with the scoped variant.
 */
export async function test_api_member_user_scoped_subscription_creation_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new member user (this also authenticates and sets Authorization header)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Register a platform admin (this also authenticates as platformAdmin)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/referrer",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. Create a community visibility level as platformAdmin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityLevelBody.code,
  );

  // 4. Switch back to member user (explicit login to be safe)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/referrer",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member login id should match join id",
    memberLoginAuthorized.id,
    memberUserId,
  );

  // 5. Create a new community as member user using the created visibility level
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
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

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code should match the one used at creation",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. Create a generic subscription to the community as member user
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionBody,
      },
    );
  typia.assert(genericSubscription);

  TestValidator.equals(
    "generic subscription should target the created community",
    genericSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "generic subscription's member user should be the authenticated member",
    genericSubscription.member_user_id,
    memberUserId,
  );

  // 7. Create a memberUser-scoped subscription via scoped endpoint
  const scopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: scopedSubscriptionBody,
      },
    );
  typia.assert(scopedSubscription);

  // 8. Validate scoped subscription semantics
  TestValidator.equals(
    "scoped subscription member_user_id must equal path memberUserId",
    scopedSubscription.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "scoped subscription community_id must equal requested community",
    scopedSubscription.community_id,
    community.id,
  );
  TestValidator.predicate(
    "scoped subscription status should be a non-empty string",
    scopedSubscription.status.length > 0,
  );
  TestValidator.predicate(
    "scoped subscription must have created_at timestamp",
    scopedSubscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "scoped subscription must have updated_at timestamp",
    scopedSubscription.updated_at.length > 0,
  );

  // 9. Cross-check consistency between generic and scoped subscriptions
  TestValidator.equals(
    "generic and scoped subscriptions should share the same member user",
    genericSubscription.member_user_id,
    scopedSubscription.member_user_id,
  );
  TestValidator.equals(
    "generic and scoped subscriptions should share the same community",
    genericSubscription.community_id,
    scopedSubscription.community_id,
  );
}
