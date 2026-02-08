import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_moderator_community_bans_create } from "../../../generate/generate_random_community_platform_moderator_community_bans_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_platform_moderator_community_ban_create_duplicate_error(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the edge case where an authenticated moderator attempts to create a duplicate ban record for the same user in the same community. The test ensures that the system enforces the uniqueness constraint on the (community_id, user_id) pair and returns appropriate error responses when a duplicate ban is attempted.
  // Step 1: Moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  // Step 2: User join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(user);
  // Step 3: User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // Step 4: User creates a community
  const userCommunityConnection: api.IConnection = { host: connection.host };
  userCommunityConnection.headers = userLoginConnection.headers;
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userCommunityConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Extract community id properly
  const communityId = (community as { id: string & tags.Format<'uuid'> }).id satisfies string & tags.Format<'uuid'> as string & tags.Format<'uuid'>;
  // Step 5: User subscribes to the community
  const userSubsConnection: api.IConnection = { host: connection.host };
  userSubsConnection.headers = userLoginConnection.headers;
  const subscription =
    await generate_random_community_platform_user_community_subscriptions_create(
      userSubsConnection,
      {
        body: {
          community_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // Step 6: Moderator login
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  moderatorLoginConnection.headers = moderatorJoinConnection.headers;
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorLogin);
  // Step 7: Moderator attempts to create a ban
  const moderatorBanConnection: api.IConnection = { host: connection.host };
  moderatorBanConnection.headers = moderatorLoginConnection.headers;
  // Use a random user_id as user id is not exposed in join/login response
  const banUserId = typia.random<string & tags.Format<'uuid'>>();
  // Create an initial ban
  const ban1 =
    await generate_random_community_platform_moderator_community_bans_create(
      moderatorBanConnection,
      {
        body: {
          community_id: communityId,
          user_id: banUserId,
        },
      },
    );
  typia.assert(ban1);
  // Step 8: Attempt to create duplicate ban for the same user and community
  await TestValidator.error("duplicate ban should be rejected", async () => {
    await generate_random_community_platform_moderator_community_bans_create(
      moderatorBanConnection,
      {
        body: {
          community_id: communityId,
          user_id: banUserId,
        },
      },
    );
  });
}
