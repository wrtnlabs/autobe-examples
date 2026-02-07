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
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_role_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 2. Create a community (which gets creator as owner, but no moderators)
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // 3. Create moderator user account (different user from community creator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAccount = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(moderatorAccount);
  // Extract moderator user ID (assuming it's in the token or response)
  // Since IRedditPlatformModerator.IAuthorized doesn't have user ID directly,
  // we need to use a different moderator ID that definitely doesn't have a role
  const nonExistentModeratorId = typia.random<string>();
  // 4. Try to retrieve non-existent moderator role from community
  // This should return an error since the moderator ID doesn't have a role in the community
  await TestValidator.error(
    "moderator role not found in community",
    async () => {
      await api.functional.redditPlatform.moderator.communities.moderators.at(
        userConnection,
        {
          communityId: (community as any).id as string, // Fallback to casting as any to access id property
          moderatorId: nonExistentModeratorId,
        },
      );
    },
  );
}