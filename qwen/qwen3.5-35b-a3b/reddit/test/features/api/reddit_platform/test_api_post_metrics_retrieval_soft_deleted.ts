import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_metrics_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  console.log("Guest authenticated:", guestAuth.id);
  // 2. Create a soft-deleted post with known metrics
  // Since no SDK function to create posts, use generated mock data to simulate soft-deleted post
  const softDeletedPost = {
    id: typia.random<string & tags.Format<"uuid">>(),
    upvotes_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    downvotes_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    score:
      typia.random<number & tags.Type<"int32">>() -
      typia.random<number & tags.Type<"int32">>(),
    comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
    deleted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    isDeleted: true,
  } satisfies IRedditPlatformPostMetric;
  console.log(
    "Simulated soft-deleted post:",
    softDeletedPost.id,
    "with isDeleted=",
    softDeletedPost.isDeleted,
  );
  // 3. Fetch metrics for the soft-deleted post
  const metrics = await api.functional.redditPlatform.guest.posts.metrics.at(
    guestConnection,
    {
      postId: softDeletedPost.id,
    },
  );
  typia.assert(metrics);
  // 4. Validate response structure and values
  TestValidator.equals("post id matches", metrics.id, softDeletedPost.id);
  TestValidator.equals(
    "upvotes_count matches",
    metrics.upvotes_count,
    softDeletedPost.upvotes_count,
  );
  TestValidator.equals(
    "downvotes_count matches",
    metrics.downvotes_count,
    softDeletedPost.downvotes_count,
  );
  TestValidator.equals("score matches", metrics.score, softDeletedPost.score);
  TestValidator.equals(
    "comment_count matches",
    metrics.comment_count,
    softDeletedPost.comment_count,
  );
  TestValidator.equals(
    "created_at matches",
    metrics.created_at,
    softDeletedPost.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    metrics.updated_at,
    softDeletedPost.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    metrics.deleted_at,
    softDeletedPost.deleted_at,
  );
  TestValidator.equals(
    "isDeleted flag is true",
    metrics.isDeleted,
    softDeletedPost.isDeleted,
  );
  // 5. Verify isDeleted is true for soft-deleted post
  TestValidator.predicate(
    "isDeleted is true for soft-deleted post",
    () => metrics.isDeleted === true,
  );
  // 6. Verify deleted_at is not null and contains valid ISO 8601 timestamp
  TestValidator.predicate(
    "deleted_at is not null",
    () => metrics.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at contains valid ISO 8601 timestamp",
    () => {
      if (!metrics.deleted_at) return false;
      const date = new Date(metrics.deleted_at);
      return !isNaN(date.getTime());
    },
  );
  // 7. Verify metrics remain accessible despite soft deletion
  TestValidator.predicate(
    "metrics accessible after soft deletion",
    () =>
      metrics.upvotes_count !== undefined &&
      metrics.downvotes_count !== undefined &&
      metrics.comment_count !== undefined &&
      metrics.score !== undefined,
  );
  console.log("✓ All soft-deleted post metrics tests passed");
}
