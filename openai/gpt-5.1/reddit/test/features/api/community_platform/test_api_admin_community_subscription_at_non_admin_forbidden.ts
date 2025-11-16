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
 * Verify that admin-only subscription inspection endpoint rejects non-admin
 * access.
 *
 * Business goals:
 *
 * - Ensure that a real adminUser can inspect a member's community subscription
 *   via GET
 *   /communityPlatform/adminUser/communities/{communityId}/subscribers/{subscriptionId}.
 * - Ensure that the same endpoint cannot be accessed when authenticated only as a
 *   plain memberUser.
 * - Ensure that unauthenticated callers are also rejected.
 *
 * Steps:
 *
 * 1. Join an adminUser account.
 * 2. Join a memberUser account.
 * 3. Authenticate as memberUser (last auth call wins in SDK).
 * 4. As memberUser, create a community.
 * 5. As memberUser, create a subscription to that community.
 * 6. Switch authentication to adminUser via admin login.
 * 7. As adminUser, call admin subscribers.at to confirm it succeeds and returns
 *    the subscription detail.
 * 8. Switch authentication back to memberUser via member login.
 * 9. As memberUser, attempt the same admin subscribers.at call and assert an HTTP
 *    error (authorization failure) is thrown.
 * 10. Create a fresh unauthenticated connection (copy host/options but blank
 *     headers) and call admin subscribers.at again, asserting an HTTP error.
 */
export async function test_api_admin_community_subscription_at_non_admin_forbidden(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!" as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Ensure we are authenticated as memberUser (join already set Authorization, but be explicit)
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. As memberUser, create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MaxLength<4000>,
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
      { body: communityBody },
    );
  typia.assert(community);

  // 5. As memberUser, create a subscription to the community
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);

  // 6. Switch authentication to adminUser via admin login
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. As adminUser, successfully fetch the subscription via admin endpoint
  const adminView: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.adminUser.communities.subscribers.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(adminView);
  TestValidator.equals(
    "admin view should match subscription id",
    adminView.id,
    subscription.id,
  );
  TestValidator.equals(
    "admin view should match community id",
    adminView.community.id,
    community.id,
  );

  // 8. Switch authentication back to memberUser
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  // 9. As memberUser, calling admin endpoint must fail (authorization error)
  await TestValidator.error(
    "memberUser cannot access admin-only subscriber at",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.subscribers.at(
        connection,
        {
          communityId: community.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // 10. Unauthenticated connection must also be rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access admin subscribers at",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.subscribers.at(
        unauthenticatedConnection,
        {
          communityId: community.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
