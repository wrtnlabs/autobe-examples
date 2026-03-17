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
 * Test the BEST sorting method which orders comments by vote score from highest to lowest.
 * Comments with the most positive community reception (highest vote counts) should appear first.
 */
export async function test_api_comment_sort_by_best_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest (required dependency)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Generate random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the endpoint with BEST sort criteria
  const response =
    await api.functional.redditLike.guest.posts.comments.sorted.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "BEST",
          page: 1,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate sorting: comments should be ordered by vote_score descending (highest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        `comment at index ${i} has vote_score >= comment at index ${i + 1}`,
        current.vote_score >= next.vote_score,
      );
    }
  }
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Verify author information is included for each comment
  response.data.forEach((comment, index) => {
    TestValidator.predicate(
      `comment ${index} has valid author id`,
      comment.author.id.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} has valid author username`,
      comment.author.username.length > 0,
    );
  });
  // 7. Verify reply count is available for each comment
  response.data.forEach((comment, index) => {
    TestValidator.predicate(
      `comment ${index} has non-negative reply_count`,
      comment.reply_count >= 0,
    );
  });
}
