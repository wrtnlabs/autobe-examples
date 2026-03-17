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
 * Test threaded comment viewing using parentId filter to retrieve direct replies to a specific comment.
 * Validates the nested reply structure of the comment system.
 *
 * Steps:
 * 1. Authenticate as guest to access the API
 * 2. Call the endpoint with sort: 'BEST', page: 1, limit: 10, parentId: null to get top-level comments
 * 3. Verify response structure and that any returned top-level comments have null parent_id
 * 4. Call the endpoint with a specific parentId (UUID) to get direct replies
 * 5. Verify response structure and that any returned comments have parent_id matching the filter
 * 6. Validate reply_count field exists and is valid for returned comments
 *
 * Business Rules Validated:
 * - parentId filter accepts null for top-level comments
 * - parentId filter accepts UUID for specific comment replies
 * - Response structure matches IPageIRedditLikeComment.ISummary
 * - Returned comments have valid parent_id references
 * - reply_count is computed and returned as int32
 */
export async function test_api_comment_threaded_view_by_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // Generate random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test fetching top-level comments with parentId: null
  const topLevelRequest = {
    sort: "BEST" as const,
    page: 1,
    limit: 10,
    search: null,
    authorId: null,
    parentId: null,
    includeDeleted: false,
  } satisfies IRedditLikeComment.IRequest;
  const topLevelResult: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.sorted.index(
      guestConnection,
      {
        postId,
        body: topLevelRequest,
      },
    );
  typia.assert(topLevelResult);
  // 3. Verify all returned top-level comments have null parent_id
  for (const comment of topLevelResult.data) {
    TestValidator.equals(
      "top-level comment has null parent_id",
      comment.parent_id,
      null,
    );
  }
  // 4. Test fetching replies with specific parentId
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  const repliesRequest = {
    sort: "BEST" as const,
    page: 1,
    limit: 10,
    search: null,
    authorId: null,
    parentId: parentCommentId,
    includeDeleted: false,
  } satisfies IRedditLikeComment.IRequest;
  const repliesResult: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.guest.posts.comments.sorted.index(
      guestConnection,
      {
        postId,
        body: repliesRequest,
      },
    );
  typia.assert(repliesResult);
  // 5. Verify all returned comments have parent_id matching the filter
  for (const comment of repliesResult.data) {
    TestValidator.equals(
      "reply comment has matching parent_id",
      comment.parent_id,
      parentCommentId,
    );
    // 6. Verify reply_count is valid (non-negative int32)
    TestValidator.predicate(
      "reply_count is non-negative",
      comment.reply_count >= 0,
    );
  }
  // Validate pagination structure for both requests
  TestValidator.predicate(
    "top-level pagination current page is valid",
    topLevelResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "replies pagination current page is valid",
    repliesResult.pagination.current >= 0,
  );
}
