import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_sections_preferences_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin/setup",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Section names for preference configuration
  const sections = [
    "Politics",
    "Economy",
    "Current Affairs",
    "Archived Discussions",
  ];
  // Configure preferences for multiple sections with different settings
  for (let i = 0; i < sections.length; i++) {
    const preferences =
      await api.functional.discussionBoard.user.profile.sections.preferences.patch(
        userConnection,
        {
          body: {
            display_order: (i + 1) satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0> as number,
            notify_new_articles: i % 2 === 0, // Enable for even-indexed sections
            notify_new_comments: i % 3 !== 0, // Disable for sections divisible by 3
            is_hidden: i === sections.length - 1, // Hide last section (Archived Discussions)
          } satisfies IDiscussionBoardSectionPreference.IRequest,
        },
      );
    typia.assert(preferences);
    // Validate preferences response structure and values
    TestValidator.equals("user matches", preferences.user.id, user.id);
    TestValidator.equals("display order", preferences.displayOrder, i + 1);
    TestValidator.predicate(
      "article notifications set correctly",
      preferences.notifyNewArticles === (i % 2 === 0),
    );
    TestValidator.predicate(
      "comment notifications set correctly",
      preferences.notifyNewComments === (i % 3 !== 0),
    );
    TestValidator.predicate(
      "hidden status set correctly",
      preferences.isHidden === (i === sections.length - 1),
    );
  }
  // Test preference persistence by retrieving and validating
  const finalPreferences =
    await api.functional.discussionBoard.user.profile.sections.preferences.patch(
      userConnection,
      {
        body: {
          display_order: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          notify_new_articles: true,
        } satisfies IDiscussionBoardSectionPreference.IRequest,
      },
    );
  typia.assert(finalPreferences);
  // Validate final preferences
  TestValidator.equals(
    "persistent user match",
    finalPreferences.user.id,
    user.id,
  );
  TestValidator.equals(
    "persistent display order",
    finalPreferences.displayOrder,
    1,
  );
  TestValidator.predicate(
    "persistent article notifications",
    finalPreferences.notifyNewArticles === true,
  );
}
