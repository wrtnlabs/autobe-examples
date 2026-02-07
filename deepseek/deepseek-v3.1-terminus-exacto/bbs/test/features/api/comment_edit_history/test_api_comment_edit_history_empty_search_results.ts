import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test search functionality when no edit history records match the filtering criteria.
 * Create authenticated user context and test searching for edit histories with restrictive
 * filters that should return empty results. Test edge cases such as searching for edit
 * sequences that don't exist (e.g., sequences 100-200 when only 3 edits exist), searching
 * for content keywords that don't appear in any edit history, and using date ranges that
 * predate all edit activity. Verify that the system correctly returns empty data arrays
 * with proper pagination metadata showing zero records found, rather than erroring or
 * returning incorrect data.
 */
export async function test_api_comment_edit_history_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test 1: Search for high edit sequence numbers that don't exist
  const highSequenceSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          edit_sequence_min: 100,
          edit_sequence_max: 200,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(highSequenceSearch);
  // Test 2: Search for content keywords that don't exist
  const keywordSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          content_search: "nonexistentkeyword12345",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Test 3: Search for date ranges that predate all activity
  const pastDateSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          created_at_start: "2020-01-01T00:00:00.000Z",
          created_at_end: "2020-01-02T00:00:00.000Z",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(pastDateSearch);
  // Test 4: Combined restrictive filters
  const combinedSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          edit_sequence_min: 1000,
          edit_sequence_max: 2000,
          content_search: "impossiblekeyword999",
          created_at_start: "2019-01-01T00:00:00.000Z",
          created_at_end: "2019-12-31T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(combinedSearch);
}
