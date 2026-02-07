import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the retrieval of section preferences for a newly registered user who has not configured any preferences.
 * The system should return an empty paginated list with proper pagination metadata.
 */
export async function test_api_user_preferences_retrieval_empty(
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
  // Retrieve preferences for the new user (should be empty)
  const preferences =
    await api.functional.discussionBoard.user.preferences.index(userConnection);
  typia.assert(preferences);
  // Validate pagination metadata for empty result set
  TestValidator.equals(
    "current page should be 1",
    preferences.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    preferences.pagination.limit > 0,
  );
  TestValidator.equals(
    "records should be 0",
    preferences.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", preferences.pagination.pages, 0);
  // Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    preferences.data.length,
    0,
  );
}
