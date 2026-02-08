import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_create_success_duplicate_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful community subscription creation by an authenticated user.
  // 1. Register user and get authorized connection
  const joinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(joinConnection, {
    body: {},
  });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Create a new community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // Use community.owner_user_id as user_id since userId is not returned from join
  const userId = (community as any).owner_user_id ?? null;
  if (userId === null)
    throw new Error("Missing owner_user_id from community response");
  // 3. Create a subscription for the user to the community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: {
          user_id: userId,
          community_id: (community as any).id,
        },
      },
    );
  typia.assert(subscription);
  // Validate subscription content fields
  TestValidator.equals(
    "subscription user_id matches",
    (subscription as any).user_id,
    userId,
  );
  TestValidator.equals(
    "subscription community_id matches",
    (subscription as any).community_id,
    (community as any).id,
  );
  TestValidator.predicate(
    "subscription created_at is string",
    typeof (subscription as any).created_at === "string",
  );
  TestValidator.predicate(
    "subscription updated_at is string",
    typeof (subscription as any).updated_at === "string",
  );
  // Scenario 2: Attempt to create duplicate subscription for the same user and community
  await TestValidator.error("duplicate subscription error", async () => {
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: {
          user_id: userId,
          community_id: (community as any).id,
        },
      },
    );
  });
  // Scenario 3: Unauthorized subscription creation attempt by unauthenticated user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized subscription creation",
    401,
    async () => {
      await generate_random_community_platform_user_subscriptions_create(
        unauthorizedConnection,
        {
          body: {
            user_id: userId,
            community_id: (community as any).id,
          },
        },
      );
    },
  );
}
