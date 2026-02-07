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

export async function test_api_user_section_preferences_boundary_display_order(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Since we cannot create sections as a regular user (admin only),
  // we need to use a valid section ID that exists in the system
  // For this test, we'll assume there's at least one active section
  // and use a realistic approach to test the preferences endpoint
  // Test various boundary conditions for display_order
  const testCases = [
    { display_order: 0, description: "minimum display order" },
    { display_order: 9999, description: "large display order" },
    { display_order: 500, description: "medium display order" },
  ];
  const notificationCombinations = [
    {
      notify_new_articles: true,
      notify_new_comments: true,
      is_hidden: false,
      description: "both notifications on",
    },
    {
      notify_new_articles: false,
      notify_new_comments: false,
      is_hidden: true,
      description: "both notifications off with hidden",
    },
    {
      notify_new_articles: true,
      notify_new_comments: false,
      is_hidden: false,
      description: "mixed notifications",
    },
    {
      notify_new_articles: false,
      notify_new_comments: true,
      is_hidden: false,
      description: "reverse mixed notifications",
    },
  ];
  // Since we cannot create sections, we'll test with a single section
  // and validate that the API accepts our preference updates
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  for (const orderCase of testCases) {
    for (const notificationCase of notificationCombinations) {
      const preference =
        await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
          userConnection,
          {
            sectionId,
            body: {
              display_order: orderCase.display_order satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              notify_new_articles: notificationCase.notify_new_articles,
              notify_new_comments: notificationCase.notify_new_comments,
              is_hidden: notificationCase.is_hidden,
            } satisfies IDiscussionBoardSectionPreference.IUpdate,
          },
        );
      typia.assert(preference);
      TestValidator.equals(
        `display_order ${orderCase.description} preserved`,
        preference.display_order,
        orderCase.display_order,
      );
      TestValidator.equals(
        `notify_new_articles ${notificationCase.description} preserved`,
        preference.notify_new_articles,
        notificationCase.notify_new_articles,
      );
      TestValidator.equals(
        `notify_new_comments ${notificationCase.description} preserved`,
        preference.notify_new_comments,
        notificationCase.notify_new_comments,
      );
      TestValidator.equals(
        `is_hidden ${notificationCase.description} preserved`,
        preference.is_hidden,
        notificationCase.is_hidden,
      );
    }
  }
}
