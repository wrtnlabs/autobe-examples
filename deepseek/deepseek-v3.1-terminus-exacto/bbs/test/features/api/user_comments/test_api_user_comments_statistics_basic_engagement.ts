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

export async function test_api_user_comments_statistics_basic_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account for testing
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create user-specific connection with authentication token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: user.token.access,
  };
  // 3. Retrieve comment statistics for the authenticated user
  const statistics =
    await api.functional.discussionBoard.user.comments.my_statistics.myStatistics(
      authenticatedConnection,
    );
  typia.assert(statistics);
  // 4. Validate statistics structure and basic engagement metrics
  // The statistics endpoint returns IDiscussionBoardArticleViewStatEvent
  // which contains view-related metrics, not comment-specific ones.
  // However, we can validate the type structure and basic numeric constraints.
  // Validate total view count is non-negative integer
  TestValidator.predicate(
    "total_view_count should be non-negative",
    statistics.total_view_count >= 0,
  );
  // Validate unique viewer count is non-negative integer
  TestValidator.predicate(
    "unique_viewer_count should be non-negative",
    statistics.unique_viewer_count >= 0,
  );
  // Validate total time spent is non-negative number
  TestValidator.predicate(
    "total_time_spent_seconds should be non-negative",
    statistics.total_time_spent_seconds >= 0,
  );
  // Validate average time spent is either null or non-negative
  if (statistics.average_time_spent_seconds !== null) {
    TestValidator.predicate(
      "average_time_spent_seconds should be non-negative when not null",
      statistics.average_time_spent_seconds >= 0,
    );
  }
  // Validate timestamps are valid date-time strings when present
  if (
    statistics.last_viewed_at !== null &&
    statistics.last_viewed_at !== undefined
  ) {
    TestValidator.predicate(
      "last_viewed_at should be a valid date-time string",
      () => {
        try {
          new Date(statistics.last_viewed_at!);
          return !isNaN(new Date(statistics.last_viewed_at!).getTime());
        } catch {
          return false;
        }
      },
    );
  }
  // Validate created_at and updated_at are valid date-time strings
  TestValidator.predicate(
    "created_at should be a valid date-time string",
    () => {
      try {
        new Date(statistics.created_at);
        return !isNaN(new Date(statistics.created_at).getTime());
      } catch {
        return false;
      }
    },
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time string",
    () => {
      try {
        new Date(statistics.updated_at);
        return !isNaN(new Date(statistics.updated_at).getTime());
      } catch {
        return false;
      }
    },
  );
  // Validate UUID format for id field
  TestValidator.predicate(
    "id should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.id,
    ),
  );
}
