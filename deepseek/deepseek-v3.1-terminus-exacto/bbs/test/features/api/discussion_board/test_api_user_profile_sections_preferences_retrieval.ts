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
import { generate_random_discussion_board_user_profile_sections_preferences_create } from "../../../generate/generate_random_discussion_board_user_profile_sections_preferences_create";
import { prepare_random_discussion_board_section_preference } from "../../../prepare/prepare_random_discussion_board_section_preference";

export async function test_api_user_profile_sections_preferences_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create section preference
  const preference =
    await generate_random_discussion_board_user_profile_sections_preferences_create(
      userConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          notify_new_articles: typia.random<boolean>(),
          notify_new_comments: typia.random<boolean>(),
          is_hidden: typia.random<boolean>(),
        } satisfies IDiscussionBoardSectionPreference.ICreate,
      },
    );
  typia.assert(preference);
  // Retrieve the preference
  const retrievedPreference =
    await api.functional.discussionBoard.user.profile.sections.preferences.at(
      userConnection,
      {
        preferenceId: preference.id,
      },
    );
  typia.assert(retrievedPreference);
  // Validate the retrieved preference matches the created one
  TestValidator.equals(
    "preference ID matches",
    retrievedPreference.id,
    preference.id,
  );
  TestValidator.equals(
    "display order matches",
    retrievedPreference.displayOrder,
    preference.displayOrder,
  );
  TestValidator.equals(
    "notify new articles matches",
    retrievedPreference.notifyNewArticles,
    preference.notifyNewArticles,
  );
  TestValidator.equals(
    "notify new comments matches",
    retrievedPreference.notifyNewComments,
    preference.notifyNewComments,
  );
  TestValidator.equals(
    "is hidden matches",
    retrievedPreference.isHidden,
    preference.isHidden,
  );
  TestValidator.equals("user ID matches", retrievedPreference.user.id, user.id);
}
