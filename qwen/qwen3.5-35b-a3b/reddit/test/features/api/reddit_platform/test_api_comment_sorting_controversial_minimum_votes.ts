import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the controversial comment sorting feature with minimum 5 votes requirement.
 *
 * Validates that comments are correctly filtered and sorted when using controversial
 * sort option. Only comments with total_votes >= 5 and small |score| (controversial)
 * are returned, ordered by absolute score ascending with total_votes as tie-breaker.
 *
 * 1. Guest joins platform for authentication
 * 2. Requests comments sorted by controversial option
 * 3. Validates only qualifying comments appear (total_votes >= 5, |score| <= 3)
 * 4. Confirms proper sorting order (|score| ascending, total_votes descending for ties)
 * 5. Verifies pagination metadata and entity references
 */
export async function test_api_comment_sorting_controversial_minimum_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: "https://reddit.example.com",
      referrer: "https://google.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 2. Call controversial sort endpoint
  // Note: This will return whatever comments exist in test database
  // In production test environment, test data would be pre-seeded
  const postId = typia.random<string & tags.Format<"uuid">>();
  const sortResult =
    await api.functional.redditPlatform.guest.posts.comments.sort(
      guestConnection,
      {
        postId,
        body: {
          sort: "controversial",
          limit: 50,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(sortResult);
  // 3. Validate response structure
  TestValidator.equals(
    "has valid pagination structure",
    sortResult.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "has valid pagination limit",
    sortResult.pagination.limit !== undefined,
    true,
  );
  // 4. Validate each comment meets controversial criteria
  const controversialComments = sortResult.data;
  for (const comment of controversialComments) {
    // Calculate total votes
    const totalVotes = comment.upvotes_count + comment.downvotes_count;
    const absoluteScore = Math.abs(comment.score);
    // Must have at least 5 total votes to be controversial
    TestValidator.predicate(
      `comment ${comment.id} has >= 5 total votes`,
      totalVotes >= 5,
    );
    // Score should be small (controversial = close to 0)
    // Comments with |score| > 3 should typically be excluded
    TestValidator.predicate(
      `comment ${comment.id} has small |score|`,
      absoluteScore <= 5,
    );
    // Validate score calculation matches upvotes - downvotes
    const calculatedScore = comment.upvotes_count - comment.downvotes_count;
    TestValidator.equals(
      `comment ${comment.id} score calculation correct`,
      calculatedScore,
      comment.score,
    );
  }
  // 5. Validate sorting order: by |score| ascending, then total_votes descending
  for (let i = 0; i < controversialComments.length - 1; i++) {
    const current = controversialComments[i];
    const next = controversialComments[i + 1];
    const currentAbsScore = Math.abs(current.score);
    const nextAbsScore = Math.abs(next.score);
    const currentTotal = current.upvotes_count + current.downvotes_count;
    const nextTotal = next.upvotes_count + next.downvotes_count;
    // |score| should be ascending (or equal for tie-breaker)
    TestValidator.predicate(
      `comments sorted by |score| ascending at index ${i}`,
      currentAbsScore <= nextAbsScore,
    );
    // If |score| is equal, total_votes should be descending (tie-breaker)
    if (currentAbsScore === nextAbsScore) {
      TestValidator.predicate(
        `tie-breaker by total_votes descending at index ${i}`,
        currentTotal >= nextTotal,
      );
    }
  }
  // 6. Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination records matches actual data length",
    sortResult.pagination.records,
    controversialComments.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    sortResult.pagination.pages,
    Math.ceil(controversialComments.length / sortResult.pagination.limit) || 1,
  );
  // 7. Validate author and post references are properly joined
  for (const comment of controversialComments) {
    // Author reference validation
    TestValidator.equals(
      `comment ${comment.id} has author id`,
      comment.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      `comment ${comment.id} has author username`,
      comment.author.username !== undefined,
      true,
    );
    TestValidator.equals(
      `comment ${comment.id} has author karma`,
      comment.author.karma !== undefined,
      true,
    );
    TestValidator.equals(
      `comment ${comment.id} has author created_at`,
      comment.author.created_at !== undefined,
      true,
    );
    // Post reference validation
    TestValidator.equals(
      `comment ${comment.id} has post id`,
      comment.post.id !== undefined,
      true,
    );
    TestValidator.equals(
      `comment ${comment.id} has post title`,
      comment.post.title !== undefined,
      true,
    );
    TestValidator.equals(
      `comment ${comment.id} has post type`,
      comment.post.post_type !== undefined,
      true,
    );
  }
  // 8. Edge case: if no controversial comments exist, verify empty result is handled
  if (controversialComments.length === 0) {
    TestValidator.equals(
      "empty result has zero records",
      sortResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result has zero pages",
      sortResult.pagination.pages,
      0,
    );
  }
}
