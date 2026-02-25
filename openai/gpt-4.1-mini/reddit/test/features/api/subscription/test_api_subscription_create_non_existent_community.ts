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
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_subscription_create_non_existent_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare user authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Attempt subscription creation with a non-existent community code
  const nonExistentCommunityCode = `${RandomGenerator.alphaNumeric(12)}_nonexistent`;
  // 3. Validate that unauthorized connection is rejected (no auth header)
  await TestValidator.httpError(
    "subscription creation requires authorization",
    401,
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await generate_random_community_platform_user_subscriptions_create(
        anonymousConnection,
        {
          body: { communityCode: nonExistentCommunityCode },
        },
      );
    },
  );
  // 4. Validate error thrown for subscription to non-existent community
  await TestValidator.error(
    "subscription creation fails for non-existent community",
    async () => {
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: { communityCode: nonExistentCommunityCode },
        },
      );
    },
  );
}
