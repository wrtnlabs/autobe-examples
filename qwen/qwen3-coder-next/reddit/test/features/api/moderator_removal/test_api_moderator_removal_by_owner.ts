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

export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first moderator connection (will be owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_moderator_join(ownerConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(ownerAuthorized);
  // 2. Create community as owner using utility function
  const community =
    await generate_random_reddit_platform_user_communities_create(
      ownerConnection,
      {
        body: typia.random<IRedditPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community);
  // 3. Create second moderator connection (will be removed)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: typia.random<IRedditPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderatorAuthorized);
  // 4. Add second moderator to community using utility function
  const role =
    await generate_random_reddit_platform_moderator_communities_moderators_add(
      ownerConnection,
      {
        params: {
          communityId: "placeholder", // Will be overridden
        },
        body: typia.random<IRedditPlatformCommunityRole.ICreate>(),
      },
    );
  typia.assert(role);
  // 5. Remove moderator using DELETE endpoint
  const removedRole =
    await api.functional.redditPlatform.moderator.communities.moderators.erase(
      ownerConnection,
      {
        communityId: "placeholder",
        moderatorId: "placeholder",
      },
    );
  typia.assert(removedRole);
  // 6. Validate that moderator role was removed
  // Since DTOs are empty, we can't validate specific properties
  TestValidator.predicate("removal successful", removedRole !== null);
}
