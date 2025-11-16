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
 * Verify that a platform administrator can retrieve an existing community
 * subscription.
 *
 * Business flow:
 *
 * 1. Create and authenticate a member user actor (memberUser.join).
 * 2. Create and authenticate a platform administrator actor (platformAdmin.join).
 * 3. As platformAdmin, create a community visibility level master record so the
 *    community can reference its code.
 * 4. Switch to memberUser context and create a community that uses the created
 *    visibility level code.
 * 5. As the same memberUser, create a subscription to that community using the
 *    memberUser communities.subscriptions.create endpoint.
 * 6. Switch back to platformAdmin context and call the platformAdmin
 *    communities.subscriptions.at endpoint with the communityId and
 *    subscriptionId obtained above.
 * 7. Assert that the retrieved subscription matches the created subscription in
 *    all key fields, and that nested memberUser and community summaries are
 *    consistent.
 * 8. Call the admin GET endpoint again and ensure the second result is identical,
 *    confirming read-only behavior.
 */
export async function test_api_platform_admin_gets_existing_community_subscription(
  connection: api.IConnection,
) {
  // 1. Register a member user and authenticate as memberUser
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      ip: null,
      href: "https://member.example.com/join",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 2. Register a platform admin (this will also authenticate as platformAdmin)
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      displayName: RandomGenerator.name(2),
      ip: undefined,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 3. As platformAdmin, create a visibility level master record
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public visibility",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Switch back to memberUser context by logging in as the member user
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoin.email,
      password: "password-1234",
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 5. Create a community under memberUser using the created visibility level code
  const communityCreateBody = {
    identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. As memberUser, create a subscription for the created community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(createdSubscription);

  // Sanity-check: created subscription fields
  TestValidator.equals(
    "created subscription community_id matches community.id",
    createdSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "created subscription status is active",
    createdSubscription.status,
    subscriptionCreateBody.status,
  );

  // 7. Switch to platformAdmin context again via login to ensure admin token is active
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: "password-1234",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  // 8. Call the platformAdmin GET endpoint to retrieve the subscription
  const fetchedByAdmin =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(fetchedByAdmin);

  // 9. Validate that fetched subscription matches the created one in key fields
  TestValidator.equals(
    "subscription id must match",
    fetchedByAdmin.id,
    createdSubscription.id,
  );
  TestValidator.equals(
    "member_user_id must match",
    fetchedByAdmin.member_user_id,
    createdSubscription.member_user_id,
  );
  TestValidator.equals(
    "community_id must match",
    fetchedByAdmin.community_id,
    createdSubscription.community_id,
  );
  TestValidator.equals(
    "status must match",
    fetchedByAdmin.status,
    createdSubscription.status,
  );
  TestValidator.equals(
    "created_at must match",
    fetchedByAdmin.created_at,
    createdSubscription.created_at,
  );
  TestValidator.equals(
    "updated_at must match",
    fetchedByAdmin.updated_at,
    createdSubscription.updated_at,
  );

  // 10. Validate nested memberUser summary is populated consistently
  TestValidator.equals(
    "nested memberUser.id equals member_user_id",
    fetchedByAdmin.memberUser.id,
    fetchedByAdmin.member_user_id,
  );

  // 11. Validate nested community summary references the same community
  TestValidator.equals(
    "nested community.id equals community_id",
    fetchedByAdmin.community.id,
    fetchedByAdmin.community_id,
  );

  // 12. Call the GET endpoint again to confirm read-only behavior
  const fetchedAgain =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(fetchedAgain);

  TestValidator.equals(
    "repeated fetch returns identical subscription object",
    fetchedAgain,
    fetchedByAdmin,
  );
}
