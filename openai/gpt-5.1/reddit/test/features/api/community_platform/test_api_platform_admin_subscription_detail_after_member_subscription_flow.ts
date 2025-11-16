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
 * Validate that a platform administrator can retrieve full details of a
 * specific community subscription after a normal member subscription workflow.
 *
 * Business flow:
 *
 * 1. Platform admin joins (registration) and becomes authenticated.
 * 2. Member user joins and becomes authenticated.
 * 3. Switch back to platform admin and create a visibility level master record.
 * 4. Switch to member user and create a community that references the visibility
 *    level code.
 * 5. Member user creates a subscription to that community.
 * 6. Switch to platform admin and fetch subscription detail by subscriptionId.
 * 7. Validate that the returned subscription links to the correct member user and
 *    community, and that core fields like status and timestamps are present.
 */
export async function test_api_platform_admin_subscription_detail_after_member_subscription_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member user joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    ip: RandomGenerator.mobile(),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to platform admin via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. As platform admin, create a visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: "Visibility level for publicly discoverable communities.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch to member user via login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Member creates a community referencing the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community identifier matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community visibility code matches master",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 7. Member creates a subscription to that community
  const subscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(createdSubscription);

  TestValidator.equals(
    "subscription community_id should match community.id",
    createdSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member_user_id should match member id",
    createdSubscription.member_user_id,
    memberLoginAuthorized.id,
  );

  // 8. Switch to platform admin again via login
  const adminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 9. As platform admin, fetch subscription detail by subscriptionId
  const subscriptionDetail: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.at(
      connection,
      {
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(subscriptionDetail);

  // 10. Business validations on the fetched subscription
  TestValidator.equals(
    "fetched subscription id matches created subscription id",
    subscriptionDetail.id,
    createdSubscription.id,
  );
  TestValidator.equals(
    "fetched memberUser.id matches member user id",
    subscriptionDetail.memberUser.id,
    memberLoginAuthorized.id,
  );
  TestValidator.equals(
    "fetched community.id matches created community id",
    subscriptionDetail.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription status should be non-empty string",
    subscriptionDetail.status.length > 0,
  );
  TestValidator.predicate(
    "created_at should be non-empty",
    subscriptionDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty",
    subscriptionDetail.updated_at.length > 0,
  );
}
