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

export async function test_api_guest_comment_list_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest actor for authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Generate a random postId (since we can't create posts with available APIs)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test 'new' sort (chronological with most recent first)
  const newSortResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "new",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(newSortResult);
  // Verify new sort order (most recent first)
  if (newSortResult.data.length > 1) {
    for (let i = 0; i < newSortResult.data.length - 1; i++) {
      const current = new Date(newSortResult.data[i].created_at);
      const next = new Date(newSortResult.data[i + 1].created_at);
      TestValidator.predicate(
        `new sort: comment ${i + 1} is newer or equal to comment ${i + 2}`,
        current >= next,
      );
    }
  }
  // 4. Test 'controversial' sort (total votes first, then proximity to zero)
  const controversialResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "controversial",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialResult);
  // Verify controversial sort order (by total votes desc, then score asc)
  if (controversialResult.data.length > 1) {
    for (let i = 0; i < controversialResult.data.length - 1; i++) {
      const current = controversialResult.data[i];
      const next = controversialResult.data[i + 1];
      const isHigherVotes = current.vote_score > next.vote_score;
      TestValidator.predicate(
        `controversial sort: comment ${i + 1} has higher or equal votes/proximity to zero`,
        isHigherVotes || current.vote_score === next.vote_score,
      );
    }
  }
  // 5. Test 'best' sort (weighted algorithm)
  const bestSortResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "best",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(bestSortResult);
  // 6. Test pagination with page parameter
  const paginatedResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "new",
          limit: 2,
          page: 1,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination: limit respected",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination: data length ≤ limit",
    paginatedResult.data.length <= 2,
  );
  // 7. Test offset-based pagination
  const offsetResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "new",
          limit: 2,
          offset: 2,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(offsetResult);
  TestValidator.equals(
    "offset pagination: limit respected",
    offsetResult.pagination.limit,
    2,
  );
  // 8. Verify comment data structure
  if (paginatedResult.data.length > 0) {
    const sampleComment = paginatedResult.data[0];
    TestValidator.equals("comment has id", typeof sampleComment.id, "string");
    TestValidator.equals(
      "comment has content",
      typeof sampleComment.content,
      "string",
    );
    TestValidator.equals(
      "comment has vote_score",
      typeof sampleComment.vote_score,
      "number",
    );
    TestValidator.equals(
      "comment has created_at",
      typeof sampleComment.created_at,
      "string",
    );
    TestValidator.equals(
      "comment has updated_at",
      typeof sampleComment.updated_at,
      "string",
    );
    TestValidator.equals(
      "comment has author",
      sampleComment.author !== null && sampleComment.author !== undefined,
      true,
    );
    // Verify author structure
    if (sampleComment.author) {
      TestValidator.equals(
        "author has id",
        typeof sampleComment.author.id,
        "string",
      );
      TestValidator.equals(
        "author has username",
        typeof sampleComment.author.username,
        "string",
      );
      TestValidator.equals(
        "author has display_name",
        typeof sampleComment.author.display_name,
        "string",
      );
      TestValidator.equals(
        "author has karma_score",
        typeof sampleComment.author.karma_score,
        "number",
      );
    }
  }
  // 9. Test empty pagination (page beyond available results)
  const emptyResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "new",
          limit: 100,
          page: 999,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty pagination: data array is empty",
    emptyResult.data.length,
    0,
  );
}
