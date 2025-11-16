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
 * Validate admin subscription inspection when community does not exist.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/adminUser/communities/{communityId}/subscribers/{subscriptionId}
 * fails with an error when the specified communityId does not exist, even if
 * the subscriptionId is valid for some other community. Also confirm that the
 * failure occurs under a valid adminUser authentication context, so the
 * resulting error is due to resource existence or association rather than
 * missing authorization.
 *
 * Scenario outline:
 *
 * 1. Register an adminUser via /auth/adminUser/join so we have an admin actor able
 *    to call the admin-only endpoint.
 * 2. Register a memberUser via /auth/memberUser/join.
 * 3. As the memberUser, create a valid community using
 *    /communityPlatform/memberUser/communities.
 * 4. As the memberUser, subscribe to that community via
 *    /communityPlatform/memberUser/subscriptions and capture the
 *    subscription.id value.
 * 5. Authenticate as the adminUser via /auth/adminUser/login to simulate a fresh
 *    admin session and ensure the Authorization header reflects the adminUser
 *    context.
 * 6. Generate a random UUID to act as an invalid communityId, ensuring it is
 *    different from the real community.id.
 * 7. Call the admin inspection endpoint
 *    /communityPlatform/adminUser/communities/{communityId}/subscribers/{subscriptionId}
 *    with the invalid communityId and the valid subscriptionId and assert that
 *    the call fails by using TestValidator.error. We do not assert specific
 *    HTTP status codes or error bodies; we only check that an error is thrown.
 */
export async function test_api_admin_community_subscription_at_not_found_community(
  connection: api.IConnection,
) {
  // 1. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Preserve admin's login identifier for later login
  const adminLoginIdentifier: string = adminAuthorized.email;
  const adminPlainPassword: string = adminJoinBody.password;

  // 2. Register a memberUser (join also authenticates the member user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As memberUser, create a valid community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. As memberUser, create a subscription for that community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 5. Authenticate as the adminUser via login to simulate a fresh admin session
  const adminLoginBody = {
    identifier: adminLoginIdentifier,
    password: adminPlainPassword,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  // 6. Generate an invalid communityId distinct from the real community.id
  let invalidCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (invalidCommunityId === community.id) {
    invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
  }

  const validSubscriptionId: string & tags.Format<"uuid"> = subscription.id;

  // 7. Call the admin inspection endpoint with invalid communityId and expect an error
  await TestValidator.error(
    "admin inspection with non-existent communityId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.subscribers.at(
        connection,
        {
          communityId: invalidCommunityId,
          subscriptionId: validSubscriptionId,
        },
      );
    },
  );
}
