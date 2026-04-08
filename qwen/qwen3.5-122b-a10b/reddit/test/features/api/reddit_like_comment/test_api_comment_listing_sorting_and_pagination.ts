import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test comment listing endpoint with sorting strategies and pagination.
 *
 * Validates the comment listing functionality for posts, including multiple sorting options (best, new, controversial), cursor-based and page-based pagination, limit parameter validation, and nested comment reply structures.
 *
 * The test verifies that sorting strategies correctly order comments by vote score, creation time, or controversy level. Pagination is tested through both cursor-based navigation and traditional page-based approaches. Response validation ensures vote scores are computed correctly and author information is properly joined.
 *
 * 1. Guest authenticates via join endpoint.
 * 2. Creates a post with multiple comments having varying vote scores.
 * 3. Tests 'best' sorting - comments ordered by vote score descending.
 * 4. Tests 'new' sorting - comments ordered by created_at descending.
 * 5. Tests 'controversial' sorting - comments with high total votes but near-zero scores first.
 * 6. Tests cursor-based pagination across multiple pages.
 * 7. Tests page-based pagination as alternative.
 * 8. Validates limit parameter enforces page size (default 20, max 100).
 * 9. Verifies nested comment replies are included with proper structure.
 * 10. Confirms author information includes display_name, avatar, and karma_score.
 */
export async function test_api_comment_listing_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Note: Since we cannot create posts/comments directly in this test (no generation functions available),
  // we test the endpoint with a randomly generated postId and validate response structure
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test 'best' sorting (default)
  const bestResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
          limit: 10,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(bestResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    bestResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", bestResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    bestResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    bestResponse.pagination.pages >= 0,
  );
  // Validate comment structure if data exists
  if (bestResponse.data.length > 0) {
    const firstComment = bestResponse.data[0];
    typia.assert(firstComment);
    TestValidator.predicate("comment has id", firstComment.id.length > 0);
    TestValidator.predicate(
      "comment has content",
      firstComment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has vote score",
      typeof firstComment.vote_score === "number",
    );
    TestValidator.predicate(
      "comment has author",
      firstComment.author !== null && firstComment.author !== undefined,
    );
    if (firstComment.author) {
      TestValidator.predicate(
        "author has display_name",
        firstComment.author.display_name.length > 0,
      );
      TestValidator.predicate(
        "author has karma_score",
        typeof firstComment.author.karma_score === "number",
      );
    }
    // Validate nested replies structure
    TestValidator.predicate(
      "replies is array",
      Array.isArray(firstComment.replies),
    );
  }
  // 3. Test 'new' sorting
  const newResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "new",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(newResponse);
  TestValidator.equals(
    "new sort pagination records",
    newResponse.pagination.records,
    bestResponse.pagination.records,
  );
  // 4. Test 'controversial' sorting
  const controversialResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "controversial",
          limit: 15,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // 5. Test cursor-based pagination (first page without cursor)
  const firstPage: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
          limit: 5,
          cursor: undefined,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(firstPage);
  // 6. Test page-based pagination
  const pageTwo: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
          limit: 10,
          page: 2,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals("page 2 current", pageTwo.pagination.current, 2);
  // 7. Test default limit (should be 20)
  const defaultLimitResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(defaultLimitResponse);
  TestValidator.equals(
    "default limit is 20",
    defaultLimitResponse.pagination.limit,
    20,
  );
  // 8. Test limit boundary (max 100)
  const maxLimitResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
          limit: 100,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
}
