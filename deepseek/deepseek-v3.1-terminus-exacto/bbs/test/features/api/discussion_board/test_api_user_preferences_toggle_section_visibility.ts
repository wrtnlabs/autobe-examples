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

/**
 * Test toggling section visibility preferences for a user.
 *
 * This test validates that users can update their section preferences to hide
 * sections from view while maintaining other preference settings. It ensures
 * that the is_hidden flag is correctly updated and the operation returns the
 * complete preference object with the new visibility setting.
 */
export async function test_api_user_preferences_toggle_section_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // 2. First, get or create an initial preference (assuming one exists)
  // For this test, we'll create a preference update that sets is_hidden to true
  const hidePreferenceUpdate = {
    is_hidden: true,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: typia.random<boolean>(),
    notify_new_comments: typia.random<boolean>(),
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const hiddenPreference =
    await api.functional.discussionBoard.user.preferences.update(
      userConnection,
      {
        body: hidePreferenceUpdate,
      },
    );
  typia.assert(hiddenPreference);
  // 3. Validate that the is_hidden flag was correctly set to true
  TestValidator.equals(
    "is_hidden flag should be true after hiding",
    hiddenPreference.is_hidden,
    true,
  );
  // 4. Now toggle the visibility back to false
  const showPreferenceUpdate = {
    is_hidden: false,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const shownPreference =
    await api.functional.discussionBoard.user.preferences.update(
      userConnection,
      {
        body: showPreferenceUpdate,
      },
    );
  typia.assert(shownPreference);
  // 5. Validate that the is_hidden flag was correctly set to false
  TestValidator.equals(
    "is_hidden flag should be false after showing",
    shownPreference.is_hidden,
    false,
  );
  // 6. Validate that other preference settings are maintained
  TestValidator.equals(
    "display order should be maintained",
    shownPreference.display_order,
    hiddenPreference.display_order,
  );
  TestValidator.equals(
    "notify_new_articles should be maintained",
    shownPreference.notify_new_articles,
    hiddenPreference.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments should be maintained",
    shownPreference.notify_new_comments,
    hiddenPreference.notify_new_comments,
  );
}
