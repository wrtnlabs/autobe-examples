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

export async function test_api_admin_community_subscription_at_inactive_or_deleted_subscription_visibility(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Adm1nP@ssw0rd!";

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 2. (Optional) login adminUser again to ensure login endpoint works and token is fresh
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 3. Register memberUser (this will switch Authorization on connection)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemP@ssw0rd!";

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 4. (Optional) login memberUser explicitly to verify login flow
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  const memberId = memberLogin.id;

  // 5. Create a community as memberUser
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

  // 6. Create a subscription for that community
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

  TestValidator.equals(
    "created subscription targets expected community",
    subscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "created subscription member user id matches",
    subscription.memberUser.id,
    memberId,
  );

  // 7. Logically delete / deactivate the subscription via memberUser delete endpoint
  await api.functional.communityPlatform.memberUser.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // 8. Switch back to adminUser by logging in as admin again
  const adminRelogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminRelogin);

  // 9. As adminUser, inspect the subscription via admin subscribers.at
  const adminView: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.adminUser.communities.subscribers.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(adminView);

  // 10. Validate that admin sees the same subscription and relationships
  TestValidator.equals(
    "admin subscriber view returns same subscription id",
    adminView.id,
    subscription.id,
  );

  TestValidator.equals(
    "admin subscriber view returns same community id",
    adminView.community.id,
    community.id,
  );

  TestValidator.equals(
    "admin subscriber view returns same member user id",
    adminView.memberUser.id,
    memberId,
  );

  // Business rule: admin must be able to see inactive or deleted subscriptions
  TestValidator.predicate(
    "admin can see inactive or deleted subscription",
    !adminView.is_active || adminView.deleted_at !== null,
  );

  // Ensure timestamps are present; typia.assert already validates formats
  TestValidator.predicate(
    "created_at present on admin subscriber view",
    !!adminView.created_at && adminView.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at present on admin subscriber view",
    !!adminView.updated_at && adminView.updated_at.length > 0,
  );
}
