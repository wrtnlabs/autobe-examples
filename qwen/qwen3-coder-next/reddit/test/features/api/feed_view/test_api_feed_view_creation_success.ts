import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_feed_views_create } from "../../../generate/generate_random_reddit_clone_moderator_feed_views_create";
import { prepare_random_reddit_clone_feed_view } from "../../../prepare/prepare_random_reddit_clone_feed_view";

export async function test_api_feed_view_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Create feed view with valid data
  const feedView = await api.functional.redditClone.moderator.feed_views.create(
    moderatorConnection,
    {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: `feed_test_${RandomGenerator.alphaNumeric(8)}`,
        ttl_seconds: 3600,
      } satisfies IRedditCloneFeedView.ICreate,
    },
  );
  typia.assert(feedView);
  // 3. Validate response fields
  TestValidator.equals("has ID", typeof feedView.id, "string");
  TestValidator.predicate(
    "feed_config_id valid UUID",
    /^[0-9a-f-]{36}$/i.test(feedView.feed_config_id),
  );
  TestValidator.predicate(
    "cache_key format",
    /^[a-zA-Z0-9_-]+$/.test(feedView.cache_key),
  );
  TestValidator.equals("ttl_seconds valid", feedView.ttl_seconds, 3600);
  TestValidator.equals("is_stale default", feedView.is_stale, false);
  TestValidator.predicate("created_at exists", Boolean(feedView.created_at));
  TestValidator.predicate("updated_at exists", Boolean(feedView.updated_at));
  TestValidator.predicate(
    "feedConfig present and valid",
    feedView.feedConfig !== null &&
      feedView.feedConfig !== undefined &&
      typeof feedView.feedConfig.users?.total === "number" &&
      typeof feedView.feedConfig.content?.posts === "number" &&
      typeof feedView.feedConfig.communities?.total === "number" &&
      typeof feedView.feedConfig.moderation?.reports_total === "number" &&
      typeof feedView.feedConfig.karma?.average === "number" &&
      typeof feedView.feedConfig.generated_at === "string",
  );
}
