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

export async function test_api_feed_view_creation_validation_errors(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: "owner@test.com",
      password: "SecurePass123!",
      username: "owner123",
      displayName: "Owner User",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Test: Create feed view with missing required fields
  await TestValidator.error("missing feed_config_id", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        cache_key: "test-feed",
        ttl_seconds: 3600,
      } as any,
    });
  });
  await TestValidator.error("missing cache_key", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        ttl_seconds: 3600,
      } as any,
    });
  });
  await TestValidator.error("missing ttl_seconds", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: "test-feed",
      } as any,
    });
  });
  // Test: Create feed view with invalid cache_key format
  await TestValidator.error(
    "invalid cache_key format (special chars)",
    async () => {
      await api.functional.redditClone.owner.feed_views.create(
        ownerConnection,
        {
          body: {
            feed_config_id: typia.random<string & tags.Format<"uuid">>(),
            cache_key: "test feed@invalid!",
            ttl_seconds: 3600,
          } as any,
        },
      );
    },
  );
  await TestValidator.error("invalid cache_key format (spaces)", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: "test feed",
        ttl_seconds: 3600,
      } as any,
    });
  });
  // Test: Create feed view with invalid TTL values
  await TestValidator.error("invalid ttl_seconds (zero)", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: "test-feed",
        ttl_seconds: 0,
      } as any,
    });
  });
  await TestValidator.error("invalid ttl_seconds (negative)", async () => {
    await api.functional.redditClone.owner.feed_views.create(ownerConnection, {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: "test-feed",
        ttl_seconds: -1,
      } as any,
    });
  });
  // Test: Valid creation should succeed
  const feedView = await api.functional.redditClone.owner.feed_views.create(
    ownerConnection,
    {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: "test-feed-valid",
        ttl_seconds: 3600,
      } satisfies IRedditCloneFeedView.ICreate,
    },
  );
  typia.assert(feedView);
  TestValidator.equals(
    "cache_key matches",
    feedView.cache_key,
    "test-feed-valid",
  );
  TestValidator.equals("ttl_seconds matches", feedView.ttl_seconds, 3600);
}