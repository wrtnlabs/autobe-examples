import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
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

export async function test_api_user_section_preferences_update_display_and_notifications(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Since we don't have admin endpoints to create sections, we'll test with
  // a valid UUID format section ID and rely on the API to handle non-existent sections
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Update preferences with comprehensive settings (true/true/false)
  const preferences1 =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          notify_new_articles: true,
          notify_new_comments: true,
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(preferences1);
  // Test 2: Update preferences with alternative settings (false/false/true)
  const preferences2 =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          notify_new_articles: false,
          notify_new_comments: false,
          is_hidden: true,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(preferences2);
  // Validate response structure and updated fields for both tests
  for (const [testName, preferences] of [
    ["first update", preferences1],
    ["second update", preferences2],
  ] as const) {
    TestValidator.equals(
      `${testName}: preference ID is UUID`,
      typeof preferences.id,
      "string",
    );
    TestValidator.equals(
      `${testName}: section ID matches`,
      preferences.section.id,
      sectionId,
    );
    TestValidator.equals(
      `${testName}: user ID matches`,
      preferences.user.id,
      user.id,
    );
    TestValidator.predicate(
      `${testName}: display_order is non-negative integer`,
      preferences.display_order >= 0,
    );
    TestValidator.predicate(
      `${testName}: created_at is valid timestamp`,
      new Date(preferences.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      `${testName}: updated_at is valid timestamp`,
      new Date(preferences.updated_at).getTime() > 0,
    );
  }
  // Validate specific boolean values for each test
  TestValidator.equals(
    "first update: notify_new_articles is true",
    preferences1.notify_new_articles,
    true,
  );
  TestValidator.equals(
    "first update: notify_new_comments is true",
    preferences1.notify_new_comments,
    true,
  );
  TestValidator.equals(
    "first update: is_hidden is false",
    preferences1.is_hidden,
    false,
  );
  TestValidator.equals(
    "second update: notify_new_articles is false",
    preferences2.notify_new_articles,
    false,
  );
  TestValidator.equals(
    "second update: notify_new_comments is false",
    preferences2.notify_new_comments,
    false,
  );
  TestValidator.equals(
    "second update: is_hidden is true",
    preferences2.is_hidden,
    true,
  );
  // Validate timestamp progression
  TestValidator.predicate(
    "updated_at progresses forward",
    new Date(preferences2.updated_at).getTime() >=
      new Date(preferences1.updated_at).getTime(),
  );
}
