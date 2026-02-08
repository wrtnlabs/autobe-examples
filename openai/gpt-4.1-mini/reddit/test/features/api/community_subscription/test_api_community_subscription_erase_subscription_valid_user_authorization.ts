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

export async function test_api_community_subscription_erase_subscription_valid_user_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a community subscription by the subscribing user.
  {
    // Register user (join)
    const userConnection: api.IConnection = { host: connection.host };
    const userJoin = await authorize_user_join(userConnection, { body: {} });
    typia.assert(userJoin);
    // Use token from join
    userConnection.headers = {
      Authorization: `Bearer ${userJoin.token.access}`,
    };
    // Create a community subscription for the user
    const subscription =
      await generate_random_community_platform_user_community_subscriptions_create(
        userConnection,
        { body: {} },
      );
    typia.assert(subscription);
    // Assuming subscription itself is the ID (string & tags.Format<"uuid">)
    await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
      userConnection,
      {
        subscriptionId: subscription as unknown as string & tags.Format<"uuid">,
      },
    );
    // Attempt to delete again should fail with 404 Not Found
    await TestValidator.httpError(
      "deletion of already deleted subscription should return 404",
      404,
      async () =>
        await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
          userConnection,
          {
            subscriptionId: subscription as unknown as string & tags.Format<"uuid">,
          },
        ),
    );
  }
  // Scenario 2: Attempt to delete a non-existing subscriptionId by a user.
  {
    const userConnection: api.IConnection = { host: connection.host };
    const userJoin = await authorize_user_join(userConnection, { body: {} });
    typia.assert(userJoin);
    userConnection.headers = {
      Authorization: `Bearer ${userJoin.token.access}`,
    };
    // Generate a random UUID which presumably does not exist
    const randomUuid = typia.random<string & tags.Format<"uuid">>();
    // Attempt deleting with non-existing subscriptionId
    await TestValidator.httpError(
      "deleting non-existent subscriptionId returns 404",
      404,
      async () =>
        await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
          userConnection,
          {
            subscriptionId: randomUuid,
          },
        ),
    );
  }
  // Scenario 3: Authorization check - user cannot delete another user's subscription.
  {
    // User A join and create subscription
    const userAConnection: api.IConnection = { host: connection.host };
    const userAJoin = await authorize_user_join(userAConnection, { body: {} });
    typia.assert(userAJoin);
    userAConnection.headers = {
      Authorization: `Bearer ${userAJoin.token.access}`,
    };
    const subscriptionA =
      await generate_random_community_platform_user_community_subscriptions_create(
        userAConnection,
        { body: {} },
      );
    typia.assert(subscriptionA);
    // User B join
    const userBConnection: api.IConnection = { host: connection.host };
    const userBJoin = await authorize_user_join(userBConnection, { body: {} });
    typia.assert(userBJoin);
    userBConnection.headers = {
      Authorization: `Bearer ${userBJoin.token.access}`,
    };
    // User B tries to delete User A's subscription
    await TestValidator.httpError(
      "user cannot delete another user's subscription",
      403,
      async () =>
        await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
          userBConnection,
          {
            subscriptionId: subscriptionA as unknown as string & tags.Format<"uuid">,
          },
        ),
    );
    // Validate that subscriptionA still exists by trying deletion by rightful user (should succeed)
    await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
      userAConnection,
      {
        subscriptionId: subscriptionA as unknown as string & tags.Format<"uuid">,
      },
    );
    // Attempt to delete again by User A should fail with 404
    await TestValidator.httpError(
      "deletion of already deleted subscription should return 404",
      404,
      async () =>
        await api.functional.communityPlatform.user.subscriptions.eraseSubscription(
          userAConnection,
          {
            subscriptionId: subscriptionA as unknown as string & tags.Format<"uuid">,
          },
        ),
    );
  }
}
