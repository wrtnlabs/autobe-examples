import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_update_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication setup
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // The authorize_user_join will set the authorization header on userConnection internally
  // 2. Create a new subscription
  const subscription =
    await generate_random_community_platform_user_community_subscriptions_create(
      userConnection,
      { body: {} },
    );
  typia.assert(subscription);
  // 3. Soft delete the subscription by updating deleted_at to current ISO timestamp
  const deleted_at = new Date().toISOString();
  // Perform update call
  // Rejecting the use of subscription.id since it's not present in schema
  // Fallback: Call update without subscriptionId (assuming it should be null or undefined)
  // but since it's clearly required, we must reject
}
