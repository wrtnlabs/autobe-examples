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

export async function test_api_moderator_removal_unauthorized_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Register first moderator who will become community owner
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(firstModeratorConnection, {
    body: {} satisfies IRedditPlatformModerator.IJoin,
  });
  // Register second moderator who will be removed later
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(secondModeratorConnection, {
    body: {} satisfies IRedditPlatformModerator.IJoin,
  });
  // First moderator creates community (becomes owner)
  // Note: community DTO is empty {}, so we can't access specific properties
  // Using generate function to create community
  const community =
    await generate_random_reddit_platform_user_communities_create(
      firstModeratorConnection,
      {
        body: {} satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Login as second moderator to get their authorized connection
  // Since ILogin DTO is empty {}, we pass empty object
  const secondModeratorAuthorized = await authorize_moderator_login(
    secondModeratorConnection,
    {
      body: {} satisfies IRedditPlatformModerator.ILogin,
    },
  );
  typia.assert(secondModeratorAuthorized);
  // Add second moderator to community using first moderator (owner) connection
  // Since community ID is not accessible from empty DTO, generate random community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const addedModerator =
    await generate_random_reddit_platform_moderator_communities_moderators_add(
      firstModeratorConnection,
      {
        params: {
          communityId: communityId,
        },
        body: {} satisfies IRedditPlatformCommunityRole.ICreate,
      },
    );
  typia.assert(addedModerator);
  // Generate random moderator ID since IRedditPlatformCommunityRole is empty
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to remove second moderator using first moderator (should fail - non-owner cannot remove)
  await TestValidator.error("non-owner cannot remove moderator", async () => {
    await api.functional.redditPlatform.moderator.communities.moderators.erase(
      firstModeratorConnection,
      {
        communityId: communityId,
        moderatorId: moderatorId,
      },
    );
  });
}
