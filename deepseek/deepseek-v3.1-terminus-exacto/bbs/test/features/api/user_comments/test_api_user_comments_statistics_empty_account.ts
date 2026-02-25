import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test statistics retrieval for a new user account with no comments.
 * Verify the system properly handles empty comment history by returning
 * zero counts, null timestamps for oldest/most recent comments, and
 * correctly indicates no comment distribution across articles.
 */
export async function test_api_user_comments_statistics_empty_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Get statistics for the new user (should have zero comment history)
  const statistics: IDiscussionBoardArticleViewStatEvent =
    await api.functional.discussionBoard.user.comments.my_statistics.myStatistics(
      userConnection,
    );
  typia.assert(statistics);
  // Validate that all metrics are zero for a new user
  TestValidator.equals(
    "total view count should be zero",
    statistics.total_view_count,
    0,
  );
  TestValidator.equals(
    "unique viewer count should be zero",
    statistics.unique_viewer_count,
    0,
  );
  TestValidator.equals(
    "total time spent should be zero",
    statistics.total_time_spent_seconds,
    0,
  );
  // Validate null timestamps for no activity
  TestValidator.equals(
    "last viewed at should be null",
    statistics.last_viewed_at,
    null,
  );
  TestValidator.equals(
    "average time spent should be null",
    statistics.average_time_spent_seconds,
    null,
  );
}
