import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_feed_views_create } from "../../../generate/generate_random_reddit_clone_owner_feed_views_create";
import { prepare_random_reddit_clone_feed_view } from "../../../prepare/prepare_random_reddit_clone_feed_view";

export async function test_api_feed_view_creation_as_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerAuthorized = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(ownerAuthorized);
  // Step 2: Create feed view with valid data
  const feedViewData = {
    feed_config_id: typia.random<string & tags.Format<"uuid">>(),
    cache_key: `home_hot_${RandomGenerator.alphaNumeric(6)}`,
    ttl_seconds: 3600 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
  } satisfies IRedditCloneFeedView.ICreate;
  const createdFeedView =
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: feedViewData,
    });
  typia.assert(createdFeedView);
  // Step 3: Validate created feed view
  TestValidator.equals(
    "feed_config_id matches",
    createdFeedView.feed_config_id,
    feedViewData.feed_config_id,
  );
  TestValidator.equals(
    "cache_key matches",
    createdFeedView.cache_key,
    feedViewData.cache_key,
  );
  TestValidator.equals(
    "ttl_seconds matches",
    createdFeedView.ttl_seconds,
    feedViewData.ttl_seconds,
  );
  TestValidator.predicate(
    "has valid id format",
    /^[0-9a-f-]{36}$/i.test(createdFeedView.id),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    createdFeedView.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    createdFeedView.updated_at !== undefined,
  );
  TestValidator.predicate(
    "feedConfig exists",
    createdFeedView.feedConfig !== undefined,
  );
}