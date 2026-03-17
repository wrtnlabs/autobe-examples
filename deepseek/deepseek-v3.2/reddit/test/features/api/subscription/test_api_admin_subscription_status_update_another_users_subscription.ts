import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_subscription_status_update_another_users_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two admin accounts (Admin A and Admin B)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminA);
  const adminB = await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminB);
  // 2. Admin B also needs a member account to create community and subscribe
  const adminBMemberConnection: api.IConnection = { host: connection.host };
  const adminBMember = await authorize_member_join(adminBMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminBMember);
  // 3. Admin B (as member) creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      adminBMemberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Admin B (as member) subscribes to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      adminBMemberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 5. Admin A (admin) attempts to update Admin B's member subscription status
  // This should fail with 403 Forbidden since Admin A is not the subscription owner
  await TestValidator.httpError(
    "Admin A cannot update Admin B's subscription",
    403,
    async () =>
      await api.functional.communityPlatform.admin.subscriptions.status(
        adminAConnection,
        {
          subscriptionId: subscription.id,
          body: {
            active: false,
          } satisfies ICommunityPlatformSubscription.IUpdate,
        },
      ),
  );
  // 6. Verify subscription remains unchanged by having Admin B (as admin) update it successfully
  // Admin B's admin connection should be able to update any subscription (admin privileges)
  const updatedSubscription =
    await api.functional.communityPlatform.admin.subscriptions.status(
      adminBConnection,
      {
        subscriptionId: subscription.id,
        body: { active: true } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  TestValidator.equals(
    "subscription active unchanged",
    updatedSubscription.active,
    true,
  );
  TestValidator.equals(
    "subscription ID unchanged",
    updatedSubscription.id,
    subscription.id,
  );
  // 7. Also verify Admin B (as member, the actual owner) can update the subscription
  // This confirms the subscription still belongs to Admin B's member account
  const memberUpdatedSubscription =
    await api.functional.communityPlatform.admin.subscriptions.status(
      adminBMemberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(memberUpdatedSubscription);
  TestValidator.equals(
    "member can still update",
    memberUpdatedSubscription.active,
    false,
  );
}
