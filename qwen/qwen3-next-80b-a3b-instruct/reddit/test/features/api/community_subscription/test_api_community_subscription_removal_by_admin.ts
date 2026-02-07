import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_community_subscription_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Admin login to obtain access token
  await authorize_admin_login(adminConnection, {
    body: typia.random<ICommunityAdmin.ILogin>(),
  });
  // 3. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 4. Member login to obtain access token
  await authorize_member_login(memberConnection, {
    body: typia.random<ICommunityMember.ILogin>(),
  });
  // 5. Member subscribes to a community (create subscription)
  const subscription =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      {
        body: typia.random<ICommunitySubscription.ICreate>(),
      },
    );
  // Use typia.assert to validate and cast the subscription to a known structure with id
  const safeSubscription = typia.assert<ICommunitySubscription & { id: string }>(subscription);
  // 6. Admin removes member's subscription
  await api.functional.community.member.subscriptions.erase(adminConnection, {
    subscriptionId: safeSubscription.id,
  });
  // 7. Validate that subscription is removed by attempting to delete again
  await TestValidator.error("subscription already deleted", async () => {
    await api.functional.community.member.subscriptions.erase(adminConnection, {
      subscriptionId: safeSubscription.id,
    });
  });
}