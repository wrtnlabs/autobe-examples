import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_like_moderator_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_moderator_retrieve_ban_different_community(
  connection: api.IConnection,
): Promise<void> {
  // Create two moderators
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await api.functional.redditLike.auth.moderator.join(
    moderatorAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(),
        password: "123456",
        bio: null,
        avatar_url: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderatorA);
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await api.functional.redditLike.auth.moderator.join(
    moderatorBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(),
        password: "123456",
        bio: null,
        avatar_url: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderatorB);
  // Create a user to ban
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.redditLike.auth.moderator.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(),
        password: "123456",
        bio: null,
        avatar_url: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(user);
  // Moderator B bans the user
  const banResponse =
    await api.functional.redditLike.moderator.communities.bans.create(
      moderatorBConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reddit_like_user_id: user.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(banResponse);
  const banId = banResponse.id;
  // Moderator A attempts to retrieve the ban (should fail with 403)
  await TestValidator.httpError(
    "Moderator cannot retrieve ban from different community",
    403,
    async () => {
      await api.functional.redditLike.moderator.bans.at(moderatorAConnection, {
        banId: banId,
      });
    },
  );
}
