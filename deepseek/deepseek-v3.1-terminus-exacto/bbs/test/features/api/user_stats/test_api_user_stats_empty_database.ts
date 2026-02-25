import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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

export async function test_api_user_stats_empty_database(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection with authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Use the authenticated connection (headers are updated internally by authorize function)
  const stats =
    await api.functional.discussionBoard.user.stats.platform(userConnection);
  typia.assert(stats);
  // The typia.assert() call above validates ALL type information including:
  // - UUID format for id
  // - String types for all string fields
  // - Number type for metric_value
  // - Date-time format for timestamps
  // - Nullable structure for systemConfiguration
  // - All required properties and their types
  // No additional validation is needed as typia.assert() provides complete runtime type validation
  // This test focuses on the successful execution flow in an empty database scenario
}
