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

export async function test_api_post_metrics_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestSession);
  // 2. Retrieve post metrics
  const postId = typia.random<string & tags.Format<"uuid">>();
  const metrics = await api.functional.redditPlatform.guest.posts.metrics.at(
    guestConnection,
    {
      postId,
    },
  );
  typia.assert(metrics);
  // 3. Validate response structure - id matches request
  TestValidator.equals("post id matches request", metrics.id, postId);
  // 4. Validate numeric field constraints - counts must be non-negative
  TestValidator.predicate(
    "upvotes count is non-negative",
    metrics.upvotes_count >= 0,
  );
  TestValidator.predicate(
    "downvotes count is non-negative",
    metrics.downvotes_count >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    metrics.comment_count >= 0,
  );
  // 5. Validate score calculation - score = upvotes_count - downvotes_count
  const expectedScore = metrics.upvotes_count - metrics.downvotes_count;
  TestValidator.equals(
    "score calculation is accurate",
    metrics.score,
    expectedScore,
  );
  // 6. Validate active post status
  TestValidator.equals("post is not deleted", metrics.isDeleted, false);
  TestValidator.equals(
    "deleted_at is null for active post",
    metrics.deleted_at,
    null,
  );
  // 7. Validate timestamp fields with typia for nullable types
  if (metrics.deleted_at !== null && metrics.deleted_at !== undefined) {
    typia.assert(metrics.deleted_at);
  }
}
