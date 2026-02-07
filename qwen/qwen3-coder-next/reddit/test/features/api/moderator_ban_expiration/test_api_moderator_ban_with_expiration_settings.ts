import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_platform_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_platform_moderator_communities_bans_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_moderator_ban_with_expiration_settings(
  connection: api.IConnection,
): Promise<void> {
  // Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  const moderatorConnectionWithToken: api.IConnection = {
    host: connection.host,
  };
  moderatorConnectionWithToken.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // Create test community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Ban with temporary expiration (24 hours)
  const temporaryBan =
    await api.functional.redditPlatform.moderator.communities.bans.create(
      moderatorConnectionWithToken,
      {
        communityId: communityId,
        body: {
          expires_at: new Date().toISOString(),
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  // Test 2: Ban without expiration (permanent)
  const permanentBan =
    await api.functional.redditPlatform.moderator.communities.bans.create(
      moderatorConnectionWithToken,
      {
        communityId: communityId,
        body: {
          expires_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(permanentBan);
}
