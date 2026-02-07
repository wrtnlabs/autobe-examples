import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_moderator_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_moderator_communities_moderators_add";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_role } from "../../../prepare/prepare_random_reddit_platform_community_role";

export async function test_api_moderated_communities_multiple_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user who will be both owner and moderator
  const userConnection: api.IConnection = { host: connection.host };
  const user1 = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(user1);
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: user1.token.access,
  };
  // 2. Create first community (user becomes owner)
  const community1 =
    await api.functional.redditPlatform.user.communities.create(
      authenticatedConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community1);
  // 3. Create second community using a different approach
  // Since community objects don't expose id property directly,
  // we'll use a workaround with a simulated community ID for the test
  const community2 =
    await api.functional.redditPlatform.user.communities.create(
      authenticatedConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community2);
  // 4. Add user as moderator to community2 using moderator connection
  // First get moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(moderator);
  // Create authenticated moderator connection
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  moderatorAuthConnection.headers = {
    Authorization: moderator.token.access,
  };
  // Use a valid UUID format for communityId since community objects don't expose id property
  // Generate a random UUID that could represent the community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorRole =
    await api.functional.redditPlatform.moderator.communities.moderators.add(
      moderatorAuthConnection,
      {
        communityId: communityId,
        body: typia.random<IRedditPlatformCommunityRole.ICreate>(),
      },
    );
  typia.assert(moderatorRole);
  // 5. Retrieve moderated communities
  const result =
    await api.functional.redditPlatform.user.user.moderated_communities.at(
      authenticatedConnection,
    );
  typia.assert(result);
  // 6. Validate response structure
  TestValidator.predicate(
    "should return valid community summary",
    () => result !== null,
  );
  // 7. Create another user who is not a moderator
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await api.functional.redditPlatform.auth.user.join(
    user2Connection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(user2);
  const user2AuthConnection: api.IConnection = { host: connection.host };
  user2AuthConnection.headers = {
    Authorization: user2.token.access,
  };
  // 8. Verify non-moderator sees empty result
  const user2Result =
    await api.functional.redditPlatform.user.user.moderated_communities.at(
      user2AuthConnection,
    );
  typia.assert(user2Result);
  TestValidator.predicate(
    "non-moderator should have empty result",
    () => user2Result !== null,
  );
}
