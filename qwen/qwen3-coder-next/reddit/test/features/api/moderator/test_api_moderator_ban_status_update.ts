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

export async function test_api_moderator_ban_status_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create a ban record using available endpoint
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    moderatorConnection,
    {
      communityId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        reddit_like_user_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_like_community_id: typia.random<string & tags.Format<"uuid">>(),
        status: "active" satisfies IRedditLikeBan.ICreate["status"],
      } satisfies IRedditLikeBan.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban is active", ban.status, "active");
  // 3. Update ban status to inactive
  const updatedBan = await api.functional.redditLike.moderator.bans.update(
    moderatorConnection,
    {
      banId: ban.id,
      body: {
        status: "inactive" satisfies IRedditLikeBan.IUpdate["status"],
      } satisfies IRedditLikeBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 4. Validate updated ban
  TestValidator.equals("ban status updated", updatedBan.status, "inactive");
  TestValidator.predicate(
    "updated_at timestamp is set",
    updatedBan.updated_at !== null,
  );
  TestValidator.notEquals(
    "timestamps are different",
    ban.created_at,
    updatedBan.updated_at,
  );
}