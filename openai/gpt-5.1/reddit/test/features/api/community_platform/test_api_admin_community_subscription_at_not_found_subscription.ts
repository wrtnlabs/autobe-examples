import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate admin inspection of a non-existent community subscription.
 *
 * Business goal: Ensure that when an adminUser inspects a specific subscriber
 * relationship for an existing community using a subscriptionId that does not
 * exist for that community, the platform responds with an HTTP error (not-found
 * style), and does not accidentally return a valid subscription body.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser (POST /auth/adminUser/join) and rely on SDK token
 *    handling for authentication.
 * 2. Register a memberUser (POST /auth/memberUser/join) and rely on SDK token
 *    handling for authentication.
 * 3. As the memberUser, create a community (POST
 *    /communityPlatform/memberUser/communities).
 * 4. As the memberUser, create a valid subscription in that community (POST
 *    /communityPlatform/memberUser/subscriptions) to ensure normal data
 *    exists.
 * 5. Switch back to the adminUser by logging in via POST /auth/adminUser/login.
 * 6. Call GET
 *    /communityPlatform/adminUser/communities/{communityId}/subscribers/{subscriptionId}
 *    using the real community.id but a random UUID subscriptionId that does not
 *    match the created subscription's id.
 * 7. Assert that the call fails with an HttpError via TestValidator.error, without
 *    asserting a specific status code, confirming not-found style behavior for
 *    missing subscription.
 */
export async function test_api_admin_community_subscription_at_not_found_subscription(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and get authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginIdentifier: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Register a memberUser and rely on token for member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. As memberUser, create a valid subscription for that community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 5. Switch back to adminUser by logging in
  const adminLoginBody = {
    identifier: adminLoginIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Generate a non-existent subscriptionId for the same community
  let nonExistentSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentSubscriptionId === subscription.id) {
    nonExistentSubscriptionId = typia.random<string & tags.Format<"uuid">>();
  }

  // 7. Call admin inspection endpoint with non-existent subscriptionId and
  //    assert that it results in an HTTP error (not-found style)
  await TestValidator.error(
    "admin subscription inspection with non-existent subscriptionId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.subscribers.at(
        connection,
        {
          communityId: community.id,
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
}
