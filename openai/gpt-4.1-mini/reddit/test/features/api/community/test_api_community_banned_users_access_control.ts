import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_banned_users_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Actor setup: Create moderator and user actors.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Moderator join and login
  const moderatorJoinBody = typia.random<ICommunityPlatformModerator.IJoin>();
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // User join and login
  const userJoinBody = typia.random<ICommunityPlatformUser.IJoin>();
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // User creates community
  const communityOriginal =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(communityOriginal);
  // The community might conform to IEntity which has 'id' as identifier
  const community = communityOriginal as IEntity & ICommunityPlatformCommunity;
  // Attempt to retrieve banned users list with userConnection, expect 403
  await TestValidator.httpError(
    "non-moderator accessing banned users list forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.index(
        userConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
  // Retrieve banned users list with moderatorConnection
  const bannedUsers =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId: community.id },
    );
  typia.assert(bannedUsers);
}
