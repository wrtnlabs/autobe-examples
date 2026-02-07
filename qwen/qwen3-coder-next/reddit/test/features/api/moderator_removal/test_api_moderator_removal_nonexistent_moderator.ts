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

export async function test_api_moderator_removal_nonexistent_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create actor-specific connections
  const moderatorOwnerConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as moderator owner and create community
  await authorize_moderator_join(moderatorOwnerConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  const community =
    await generate_random_reddit_platform_user_communities_create(
      moderatorOwnerConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community);
  // 3. Add a valid moderator to the community first
  // First authenticate as a new moderator user
  const newModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(newModeratorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // Since we can't extract the user ID from the connection, we'll need to use a random one
  // In a real scenario, we'd extract the user ID from the authentication response
  const validModeratorId = typia.random<string & tags.Format<"uuid">>();
  const moderatorRole =
    await generate_random_reddit_platform_moderator_communities_moderators_add(
      moderatorOwnerConnection,
      {
        params: { communityId: (community as any).id },
        body: typia.random<IRedditPlatformCommunityRole.ICreate>(),
      },
    );
  typia.assert(moderatorRole);
  // 4. Attempt to remove non-existent moderator with random UUID
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent moderator",
    404,
    async () =>
      await api.functional.redditPlatform.moderator.communities.moderators.erase(
        moderatorOwnerConnection,
        {
          communityId: (community as any).id,
          moderatorId: nonExistentModeratorId,
        },
      ),
  );
}
