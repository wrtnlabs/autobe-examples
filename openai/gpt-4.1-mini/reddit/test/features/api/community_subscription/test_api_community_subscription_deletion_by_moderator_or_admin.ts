import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_deletion_by_moderator_or_admin(
  connection: api.IConnection,
): Promise<void> {
  // Moderator (admin) joins and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const modJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(modJoin);
  moderatorConnection.headers = {
    Authorization: modJoin.token.access,
  };
  // User joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  userConnection.headers = {
    Authorization: userJoin.token.access,
  };
  // User creates a community subscription
  const subscription =
    await generate_random_community_platform_user_community_subscriptions_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(subscription);
  // Moderator deletes the user's subscription
  await api.functional.communityPlatform.user.community_subscriptions.erase(
    moderatorConnection,
    {
      subscriptionId: (subscription as any)["id"] as string,
    },
  );
  // User tries to delete the same subscription again (should fail)
  await TestValidator.error(
    "deleting already deleted subscription should fail",
    async () => {
      await api.functional.communityPlatform.user.community_subscriptions.erase(
        userConnection,
        {
          subscriptionId: (subscription as any)["id"] as string,
        },
      );
    },
  );
}
