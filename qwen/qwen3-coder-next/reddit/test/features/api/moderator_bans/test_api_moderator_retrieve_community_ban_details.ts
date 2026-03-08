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

export async function test_api_moderator_retrieve_community_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // Create authorized connection for moderator
  const authorizedConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_login(authorizedConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator.email),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // Use mock community and user IDs (would be available in test environment)
  const communityId = "00000000-0000-0000-0000-000000000001";
  const userId = "00000000-0000-0000-0000-000000000002";
  // Create a ban using the moderator's community ban creation
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    authorizedConnection,
    {
      communityId: communityId,
      body: {
        reddit_like_user_id: userId,
        reddit_like_community_id: communityId,
        status: "active",
      },
    },
  );
  typia.assert(ban);
  // Retrieve the ban using the banId
  const retrievedBan = await api.functional.redditLike.moderator.bans.at(
    authorizedConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate retrieved ban matches the created ban
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "user ID matches",
    retrievedBan.reddit_like_user_id,
    ban.reddit_like_user_id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.reddit_like_community_id,
    ban.reddit_like_community_id,
  );
  TestValidator.equals("status matches", retrievedBan.status, ban.status);
  TestValidator.predicate(
    "created_at exists",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedBan.updated_at !== null,
  );
}