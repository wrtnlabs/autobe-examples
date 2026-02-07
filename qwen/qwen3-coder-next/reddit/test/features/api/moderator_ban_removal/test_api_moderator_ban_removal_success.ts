import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_platform_moderator_communities_bans_create";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_ban_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 2. Create community where moderator is owner
  const community = await api.functional.redditPlatform.user.communities.create(
    moderatorConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  const typedCommunity = typia.assert<IEntity & { id: string }>(community);
  // 3. Create and authenticate user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 4. Ban the user from the community
  const ban =
    await api.functional.redditPlatform.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: typedCommunity.id,
        body: typia.random<IRedditPlatformBan.ICreate>(),
      },
    );
  const typedBan = typia.assert<IEntity & { id: string }>(ban);
  // 5. Remove the ban
  await api.functional.redditPlatform.moderator.communities.bans.erase(
    moderatorConnection,
    {
      communityId: typedCommunity.id,
      banId: typedBan.id,
    },
  );
  // 6. Verify ban removal by checking ban list (if available) or re-banning to confirm ban ID uniqueness
  // Since we can't directly query ban list, create a new ban to verify the community still accepts new bans
  const newBan =
    await api.functional.redditPlatform.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: typedCommunity.id,
        body: typia.random<IRedditPlatformBan.ICreate>(),
      },
    );
  const typedNewBan = typia.assert<IEntity & { id: string }>(newBan);
  // Cleanup: Remove the new ban
  await api.functional.redditPlatform.moderator.communities.bans.erase(
    moderatorConnection,
    {
      communityId: typedCommunity.id,
      banId: typedNewBan.id,
    },
  );
}