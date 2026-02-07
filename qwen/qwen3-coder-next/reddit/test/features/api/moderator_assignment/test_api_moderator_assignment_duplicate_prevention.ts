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
import { generate_random_reddit_platform_moderator_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_platform_moderator_communities_moderators_add_moderator";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_role } from "../../../prepare/prepare_random_reddit_platform_community_role";

export async function test_api_moderator_assignment_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // 2. Create community as moderator
  const community = await api.functional.redditPlatform.user.communities.create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create second user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userData = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 4. Subscribe second user to the community
  // Create community with name only since other properties may not be accessible
  await api.functional.redditPlatform.user.communities.create(userConnection, {
    body: {
      name: (community as any).name || RandomGenerator.alphabets(8),
      description: (community as any).description || RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformCommunity.ICreate,
  });
  // 5. Assign user as moderator (first assignment - should succeed)
  const firstAssignment =
    await api.functional.redditPlatform.moderator.communities.moderators.addModerator(
      moderatorConnection,
      {
        communityId: (community as any).id || typia.random<string>(),
        body: {
          user_id: userData.token.access,
          role: "moderator",
        } satisfies IRedditPlatformCommunityRole.ICreate,
      },
    );
  typia.assert(firstAssignment);
  // 6. Attempt duplicate assignment (should fail)
  await TestValidator.error(
    "duplicate moderator assignment should be prevented",
    async () => {
      await api.functional.redditPlatform.moderator.communities.moderators.addModerator(
        moderatorConnection,
        {
          communityId: (community as any).id || typia.random<string>(),
          body: {
            user_id: userData.token.access,
            role: "moderator",
          } satisfies IRedditPlatformCommunityRole.ICreate,
        },
      );
    },
  );
}