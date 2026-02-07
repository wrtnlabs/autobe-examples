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

export async function test_api_moderator_assignment_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first moderator to create community A
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await api.functional.redditPlatform.auth.moderator.join(
    moderatorAConnection,
    {
      body: typia.random<IRedditPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderatorA);
  // 2. Create community A owned by moderator A
  const communityA =
    await api.functional.redditPlatform.user.communities.create(
      moderatorAConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(communityA);
  // 3. Register second moderator to create community B
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await api.functional.redditPlatform.auth.moderator.join(
    moderatorBConnection,
    {
      body: typia.random<IRedditPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderatorB);
  // 4. Create community B owned by moderator B
  const communityB =
    await api.functional.redditPlatform.user.communities.create(
      moderatorBConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(communityB);
  // 5. Try to add a moderator to community A using moderator B's credentials
  // (This should fail because moderator B doesn't own community A)
  // Generate a random UUID as community ID since IRedditPlatformCommunity is empty
  const nonOwnedCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "moderator B cannot add moderator to community A",
    403,
    async () => {
      await api.functional.redditPlatform.moderator.communities.moderators.addModerator(
        moderatorBConnection,
        {
          communityId: nonOwnedCommunityId,
          body: typia.random<IRedditPlatformCommunityRole.ICreate>(),
        },
      );
    },
  );
}
